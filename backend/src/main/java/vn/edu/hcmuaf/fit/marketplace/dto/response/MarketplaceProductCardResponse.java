package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceProductCardResponse {
    private UUID id;
    private String slug;
    private String productCode;
    private String name;
    private String image;
    private BigDecimal price;
    private String priceAmount;
    private BigDecimal originalPrice;
    private String originalPriceAmount;
    private String badge;
    private List<String> colors;
    private Integer stock;
    private UUID storeId;
    private String storeName;
    private String storeSlug;
    private String storeLogo;
    private Double storeRating;
    private Boolean officialStore;
    private List<String> sizes;
    private List<VariantOption> variants;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariantOption {
        private UUID id;
        private String sku;
        private String color;
        private String colorHex;
        private String size;
        private Integer stockQuantity;
    }
}
