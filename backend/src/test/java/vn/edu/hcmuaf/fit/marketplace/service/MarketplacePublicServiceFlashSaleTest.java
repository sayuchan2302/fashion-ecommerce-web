package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceFlashSaleResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.FlashSaleCampaign;
import vn.edu.hcmuaf.fit.marketplace.entity.FlashSaleItem;
import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductImage;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.repository.CategoryRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.FlashSaleCampaignRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.FlashSaleItemRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.OrderRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductVariantRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketplacePublicServiceFlashSaleTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private FlashSaleCampaignRepository flashSaleCampaignRepository;

    @Mock
    private FlashSaleItemRepository flashSaleItemRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    private MarketplacePublicService marketplacePublicService;

    @BeforeEach
    void setUp() {
        VisionSearchProperties visionSearchProperties = new VisionSearchProperties();
        visionSearchProperties.setMaxCandidates(120);
        visionSearchProperties.setMaxUploadSizeBytes(5_242_880L);
        StorePerformanceMetricsService storePerformanceMetricsService = new StorePerformanceMetricsService(orderRepository);

        marketplacePublicService = new MarketplacePublicService(
                productRepository,
                productVariantRepository,
                storeRepository,
                categoryRepository,
                flashSaleCampaignRepository,
                flashSaleItemRepository,
                storePerformanceMetricsService,
                null,
                visionSearchProperties
        );
    }

    @Test
    void getActiveFlashSaleSkipsItemsWithoutCatalogImages() {
        LocalDateTime now = LocalDateTime.now();
        Store store = Store.builder()
                .id(UUID.randomUUID())
                .name("An Urban")
                .slug("an-urban")
                .status(Store.StoreStatus.ACTIVE)
                .approvalStatus(Store.ApprovalStatus.APPROVED)
                .build();
        FlashSaleCampaign campaign = FlashSaleCampaign.builder()
                .id(UUID.randomUUID())
                .name("Flash Sale gio vang")
                .status(FlashSaleCampaign.CampaignStatus.RUNNING)
                .startAt(now.minusHours(1))
                .endAt(now.plusHours(4))
                .build();

        Product imagelessFixture = flashSaleProduct(store.getId(), "it-product-fixture", null);
        Product realProduct = flashSaleProduct(store.getId(), "gap-real-product", "https://img.local/real.jpg");

        FlashSaleItem fixtureItem = flashSaleItem(campaign, imagelessFixture, new BigDecimal("40000"));
        FlashSaleItem realItem = flashSaleItem(campaign, realProduct, new BigDecimal("119200"));

        when(flashSaleCampaignRepository.findFirstActiveAt(any()))
                .thenReturn(Optional.of(campaign));
        when(flashSaleItemRepository.findPublicActiveByCampaignId(
                eq(campaign.getId()),
                eq(FlashSaleCampaign.CampaignStatus.RUNNING),
                eq(FlashSaleItem.ItemStatus.ACTIVE),
                any()
        )).thenReturn(List.of(fixtureItem, realItem));
        when(storeRepository.findAllById(any())).thenReturn(List.of(store));

        MarketplaceFlashSaleResponse response = marketplacePublicService.getActiveFlashSale();

        assertEquals(1, response.getItems().size());
        assertEquals(realProduct.getId(), response.getItems().get(0).getProductId());
        assertEquals("gap-real-product", response.getItems().get(0).getProductSlug());
    }

    @Test
    void getActiveFlashSaleRepairsLocalSeedCampaignWhenVisibleItemsAreEmpty() {
        LocalDateTime now = LocalDateTime.now();
        Store store = Store.builder()
                .id(UUID.randomUUID())
                .name("An Urban")
                .slug("an-urban")
                .status(Store.StoreStatus.ACTIVE)
                .approvalStatus(Store.ApprovalStatus.APPROVED)
                .build();
        FlashSaleCampaign staleCampaign = FlashSaleCampaign.builder()
                .id(UUID.randomUUID())
                .name("Flash Sale gio vang")
                .description("Campaign mac dinh cho moi truong local seed.")
                .updatedBy("gap-seed")
                .status(FlashSaleCampaign.CampaignStatus.RUNNING)
                .scope(FlashSaleCampaign.CampaignScope.PLATFORM)
                .startAt(now.minusHours(1))
                .endAt(now.plusHours(4))
                .build();
        FlashSaleCampaign rebuiltCampaign = FlashSaleCampaign.builder()
                .id(UUID.randomUUID())
                .name("Flash Sale gio vang")
                .description("Campaign mac dinh cho moi truong local seed.")
                .updatedBy("gap-seed")
                .status(FlashSaleCampaign.CampaignStatus.RUNNING)
                .scope(FlashSaleCampaign.CampaignScope.PLATFORM)
                .startAt(now.minusHours(1))
                .endAt(now.plusDays(3))
                .build();

        Product imagelessFixture = flashSaleProduct(store.getId(), "it-product-fixture", null);
        Product realProduct = flashSaleProduct(store.getId(), "gap-real-product", "https://img.local/real.jpg");
        FlashSaleItem staleItem = flashSaleItem(staleCampaign, imagelessFixture, new BigDecimal("40000"));
        FlashSaleItem rebuiltItem = flashSaleItem(rebuiltCampaign, realProduct, new BigDecimal("119200"));

        when(flashSaleCampaignRepository.findFirstActiveAt(any()))
                .thenReturn(Optional.of(staleCampaign));
        when(flashSaleItemRepository.findPublicActiveByCampaignId(
                eq(staleCampaign.getId()),
                eq(FlashSaleCampaign.CampaignStatus.RUNNING),
                eq(FlashSaleItem.ItemStatus.ACTIVE),
                any()
        )).thenReturn(List.of(staleItem));
        when(flashSaleItemRepository.findPublicActiveByCampaignId(
                eq(rebuiltCampaign.getId()),
                eq(FlashSaleCampaign.CampaignStatus.RUNNING),
                eq(FlashSaleItem.ItemStatus.ACTIVE),
                any()
        )).thenReturn(List.of(rebuiltItem));
        when(productRepository.findAllPublicProducts()).thenReturn(List.of(imagelessFixture, realProduct));
        when(productVariantRepository.findByProductIdAndIsActiveTrue(realProduct.getId())).thenReturn(List.of());
        when(storeRepository.findAllById(any())).thenReturn(List.of(store));
        when(flashSaleCampaignRepository.save(any(FlashSaleCampaign.class)))
                .thenReturn(rebuiltCampaign);

        MarketplaceFlashSaleResponse response = marketplacePublicService.getActiveFlashSale();

        assertEquals(1, response.getItems().size());
        assertEquals(rebuiltCampaign.getId(), response.getCampaignId());
        assertEquals(realProduct.getId(), response.getItems().get(0).getProductId());
    }

    private FlashSaleItem flashSaleItem(FlashSaleCampaign campaign, Product product, BigDecimal flashPrice) {
        return FlashSaleItem.builder()
                .id(UUID.randomUUID())
                .campaign(campaign)
                .product(product)
                .flashPrice(flashPrice)
                .quota(20)
                .soldCount(0)
                .status(FlashSaleItem.ItemStatus.ACTIVE)
                .build();
    }

    private Product flashSaleProduct(UUID storeId, String slug, String imageUrl) {
        Product product = Product.builder()
                .id(UUID.randomUUID())
                .slug(slug)
                .sku(slug.toUpperCase())
                .name(slug)
                .storeId(storeId)
                .stockQuantity(10)
                .basePrice(new BigDecimal("149000"))
                .salePrice(new BigDecimal("149000"))
                .status(Product.ProductStatus.ACTIVE)
                .approvalStatus(Product.ApprovalStatus.APPROVED)
                .variants(List.of())
                .build();
        if (imageUrl != null) {
            ProductImage image = ProductImage.builder()
                    .product(product)
                    .url(imageUrl)
                    .isPrimary(true)
                    .sortOrder(0)
                    .build();
            product.setImages(List.of(image));
        }
        return product;
    }
}
