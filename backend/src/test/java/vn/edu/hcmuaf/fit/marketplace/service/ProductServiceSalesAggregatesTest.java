package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.VendorProductPageResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Category;
import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductImage;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductVariant;
import vn.edu.hcmuaf.fit.marketplace.repository.CategoryRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.OrderRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductVariantRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceSalesAggregatesTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private ProductService productService;

    @Test
    void getVendorProductPageIncludesDeliveredSalesAggregates() {
        UUID storeId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Ao");

        Product product = Product.builder()
                .id(productId)
                .name("Ao polo")
                .slug("ao-polo")
                .category(category)
                .basePrice(new BigDecimal("250000"))
                .salePrice(new BigDecimal("199000"))
                .status(Product.ProductStatus.ACTIVE)
                .build();
        product.setVariants(List.of(ProductVariant.builder()
                .sku("AO-POLO-001")
                .stockQuantity(25)
                .isActive(true)
                .build()));
        product.setImages(List.of(ProductImage.builder()
                .url("https://cdn.example/ao-polo.jpg")
                .isPrimary(true)
                .build()));

        when(productRepository.searchVendorProducts(
                eq(storeId),
                eq(Product.ProductStatus.ACTIVE),
                eq("ao"),
                eq(null),
                eq(null),
                eq(10),
                any(PageRequest.class)
        )).thenReturn(new PageImpl<>(List.of(product), PageRequest.of(0, 10), 1));

        when(productRepository.countByStoreIdExcludingArchived(storeId)).thenReturn(1L);
        when(productRepository.countByStoreIdAndStatus(storeId, Product.ProductStatus.ACTIVE)).thenReturn(1L);
        when(productRepository.countByStoreIdAndStatus(storeId, Product.ProductStatus.DRAFT)).thenReturn(0L);
        when(productRepository.countByStoreIdAndStatus(storeId, Product.ProductStatus.INACTIVE)).thenReturn(0L);
        when(productRepository.countOutOfStockByStoreId(storeId)).thenReturn(0L);
        when(productRepository.countLowStockByStoreId(storeId, 10)).thenReturn(0L);

        when(orderRepository.findDeliveredProductSalesByStoreAndProductIds(eq(storeId), any()))
                .thenReturn(List.of(projection(
                        productId,
                        "Ao polo",
                        "https://cdn.example/ao-polo.jpg",
                        17L,
                        new BigDecimal("3383000")
                )));

        VendorProductPageResponse page = productService.getVendorProductPage(
                storeId,
                Product.ProductStatus.ACTIVE,
                "ao",
                null,
                null,
                PageRequest.of(0, 10)
        );

        assertEquals(1, page.getContent().size());
        assertEquals(17L, page.getContent().get(0).getSoldCount());
        assertEquals(new BigDecimal("3383000"), page.getContent().get(0).getGrossRevenue());
    }

    @Test
    void getVendorProductPageSkipsSalesQueryWhenPageEmpty() {
        UUID storeId = UUID.randomUUID();
        when(productRepository.searchVendorProducts(
                eq(storeId),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(10),
                any(PageRequest.class)
        )).thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        when(productRepository.countByStoreIdExcludingArchived(storeId)).thenReturn(0L);
        when(productRepository.countByStoreIdAndStatus(storeId, Product.ProductStatus.ACTIVE)).thenReturn(0L);
        when(productRepository.countByStoreIdAndStatus(storeId, Product.ProductStatus.DRAFT)).thenReturn(0L);
        when(productRepository.countByStoreIdAndStatus(storeId, Product.ProductStatus.INACTIVE)).thenReturn(0L);
        when(productRepository.countOutOfStockByStoreId(storeId)).thenReturn(0L);
        when(productRepository.countLowStockByStoreId(storeId, 10)).thenReturn(0L);

        VendorProductPageResponse page = productService.getVendorProductPage(
                storeId,
                null,
                null,
                null,
                null,
                PageRequest.of(0, 10)
        );

        assertEquals(0, page.getContent().size());
        verify(orderRepository, never()).findDeliveredProductSalesByStoreAndProductIds(eq(storeId), any());
    }

    private static OrderRepository.ProductSalesProjection projection(
            UUID productId,
            String productName,
            String productImage,
            Long soldCount,
            BigDecimal grossRevenue
    ) {
        return new OrderRepository.ProductSalesProjection() {
            @Override
            public UUID getProductId() {
                return productId;
            }

            @Override
            public String getProductName() {
                return productName;
            }

            @Override
            public String getProductImage() {
                return productImage;
            }

            @Override
            public Long getSoldCount() {
                return soldCount;
            }

            @Override
            public BigDecimal getGrossRevenue() {
                return grossRevenue;
            }
        };
    }
}
