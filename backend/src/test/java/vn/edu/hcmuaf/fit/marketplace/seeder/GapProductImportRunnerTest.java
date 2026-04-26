package vn.edu.hcmuaf.fit.marketplace.seeder;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.hcmuaf.fit.marketplace.config.GapSeedProperties;
import vn.edu.hcmuaf.fit.marketplace.dto.request.ProductRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.Category;
import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.repository.CategoryRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.service.ProductService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GapProductImportRunnerTest {

    @TempDir
    Path tempDir;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private CategoryRepository categoryRepository;

    private FakeProductService productService;
    private GapSeedProperties properties;
    private GapProductImportRunner runner;

    @BeforeEach
    void setUp() {
        properties = new GapSeedProperties();
        properties.setEnabled(true);
        properties.setTargetCount(6);
        properties.setCleanBeforeImport(true);
        productService = new FakeProductService();
        runner = new GapProductImportRunner(
                properties,
                productService,
                productRepository,
                storeRepository,
                categoryRepository
        );
    }

    @Test
    void importMapsRowsToExpectedLeafCategories() throws IOException {
        Category menRoot = category("men", null);
        Category womenRoot = category("women", null);
        Category menLeaf = category("men-ao-thun", menRoot);
        Category womenLeaf = category("women-ao-so-mi", womenRoot);

        Store store = Store.builder().id(UUID.randomUUID()).build();

        Path styles = writeStylesCsv(List.of(
                "201,Women,Apparel,Topwear,Shirts,Blue,Summer,2019,Casual,Women Shirt 201",
                "202,Men,Apparel,Topwear,Tshirts,Black,Summer,2019,Casual,Men Tee 202"
        ));
        Path images = writeImagesCsv(List.of(
                "201.jpg,https://img.local/201.jpg",
                "202.jpg,https://img.local/202.jpg"
        ));

        properties.setTargetCount(2);
        properties.setStylesPath(styles.toString());
        properties.setImagesPath(images.toString());
        properties.setCleanBeforeImport(false);

        when(storeRepository.findByApprovalStatusAndStatus(Store.ApprovalStatus.APPROVED, Store.StoreStatus.ACTIVE))
                .thenReturn(List.of(store));
        when(categoryRepository.findAll()).thenReturn(List.of(menRoot, womenRoot, menLeaf, womenLeaf));
        when(productRepository.findBySlugStartingWithIgnoreCase(anyString())).thenReturn(List.of());

        runner.runImport();

        List<ProductRequest> requests = productService.requests;
        assertEquals(2, requests.size());
        assertEquals(List.of(store.getId(), store.getId()), productService.storeIds);

        Map<String, UUID> categoryBySlug = requests.stream()
                .collect(Collectors.toMap(ProductRequest::getSlug, ProductRequest::getCategoryId));
        assertEquals(womenLeaf.getId(), categoryBySlug.get("gap-201"));
        assertEquals(menLeaf.getId(), categoryBySlug.get("gap-202"));
    }

    @Test
    void importDistributesEvenlyAndAppliesFallbackValues() throws IOException {
        Category menRoot = category("men", null);
        Category womenRoot = category("women", null);
        Category accessoriesRoot = category("accessories", null);
        Category menLeaf = category("men-ao-thun", menRoot);
        Category womenLeaf = category("women-ao-kieu", womenRoot);
        Category accessoryLeaf = category("tui-xach", accessoriesRoot);

        UUID storeA = UUID.randomUUID();
        UUID storeB = UUID.randomUUID();
        Store firstStore = Store.builder().id(storeA).build();
        Store secondStore = Store.builder().id(storeB).build();

        Path styles = writeStylesCsv(List.of(
                "100,Men,Apparel,Topwear,Tshirts,NA,,2018,NA,Sample 100",
                "101,Men,Apparel,Topwear,Tshirts,Black,Summer,2018,Casual,Sample 101",
                "102,Men,Apparel,Topwear,Tshirts,White,Summer,2018,Casual,Sample 102",
                "103,Men,Apparel,Topwear,Tshirts,Blue,Summer,2018,Casual,Sample 103",
                "104,Men,Apparel,Topwear,Tshirts,Green,Summer,2018,Casual,Sample 104",
                "105,Men,Apparel,Topwear,Tshirts,Grey,Summer,2018,Casual,Sample 105"
        ));
        Path images = writeImagesCsv(List.of(
                "100.jpg,https://img.local/100.jpg",
                "101.jpg,https://img.local/101.jpg",
                "102.jpg,https://img.local/102.jpg",
                "103.jpg,https://img.local/103.jpg",
                "104.jpg,https://img.local/104.jpg",
                "105.jpg,https://img.local/105.jpg"
        ));

        properties.setTargetCount(6);
        properties.setStylesPath(styles.toString());
        properties.setImagesPath(images.toString());
        properties.setCleanBeforeImport(true);

        Product stale = new Product();
        stale.setSlug("gap-legacy");

        when(storeRepository.findByApprovalStatusAndStatus(Store.ApprovalStatus.APPROVED, Store.StoreStatus.ACTIVE))
                .thenReturn(List.of(firstStore, secondStore));
        when(categoryRepository.findAll()).thenReturn(List.of(
                menRoot, womenRoot, accessoriesRoot, menLeaf, womenLeaf, accessoryLeaf
        ));
        when(productRepository.findBySlugStartingWithIgnoreCase("gap-")).thenReturn(List.of(stale));
        when(productRepository.save(org.mockito.ArgumentMatchers.any(Product.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        runner.runImport();

        verify(productRepository).deleteAll(List.of(stale));
        verify(productRepository).flush();

        List<ProductRequest> requests = productService.requests;
        List<UUID> storeIds = productService.storeIds;
        assertEquals(6, requests.size());
        assertEquals(6, storeIds.size());

        List<UUID> expectedStoreOrder = List.of(storeA, storeB).stream()
                .sorted(Comparator.comparing(UUID::toString))
                .toList();
        assertEquals(expectedStoreOrder.get(0), storeIds.get(0));
        assertEquals(expectedStoreOrder.get(1), storeIds.get(1));
        assertEquals(expectedStoreOrder.get(0), storeIds.get(2));
        assertEquals(expectedStoreOrder.get(1), storeIds.get(3));
        assertEquals(expectedStoreOrder.get(0), storeIds.get(4));
        assertEquals(expectedStoreOrder.get(1), storeIds.get(5));

        Map<UUID, Long> countByCategory = requests.stream()
                .collect(Collectors.groupingBy(ProductRequest::getCategoryId, Collectors.counting()));
        assertEquals(6L, countByCategory.get(menLeaf.getId()));
        assertTrue(!countByCategory.containsKey(womenLeaf.getId()) || countByCategory.get(womenLeaf.getId()) == 0L);
        assertTrue(!countByCategory.containsKey(accessoryLeaf.getId()) || countByCategory.get(accessoryLeaf.getId()) == 0L);

        ProductRequest fallbackRow = requests.stream()
                .filter(request -> "gap-100".equals(request.getSlug()))
                .findFirst()
                .orElseThrow();

        assertTrue(fallbackRow.getDescription().contains("Usage: Casual."));
        assertTrue(fallbackRow.getDescription().contains("Season: All season."));
        assertNotNull(fallbackRow.getVariants());
        assertEquals("Mixed", fallbackRow.getVariants().get(0).getColor());
    }

    private Category category(String slug, Category parent) {
        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setSlug(slug);
        category.setName(slug);
        category.setParent(parent);
        category.setIsVisible(true);
        return category;
    }

    private Path writeStylesCsv(List<String> rows) throws IOException {
        Path path = tempDir.resolve("styles.csv");
        String header = "id,gender,masterCategory,subCategory,articleType,baseColour,season,year,usage,productDisplayName";
        Files.writeString(path, header + System.lineSeparator() + String.join(System.lineSeparator(), rows));
        return path;
    }

    private Path writeImagesCsv(List<String> rows) throws IOException {
        Path path = tempDir.resolve("images.csv");
        String header = "filename,link";
        Files.writeString(path, header + System.lineSeparator() + String.join(System.lineSeparator(), rows));
        return path;
    }

    private static class FakeProductService extends ProductService {
        private final List<ProductRequest> requests = new java.util.ArrayList<>();
        private final List<UUID> storeIds = new java.util.ArrayList<>();

        FakeProductService() {
            super(null, null, null, null, null);
        }

        @Override
        public Product createForStore(ProductRequest request, UUID storeId) {
            requests.add(request);
            storeIds.add(storeId);
            Product product = new Product();
            product.setId(UUID.randomUUID());
            return product;
        }
    }
}
