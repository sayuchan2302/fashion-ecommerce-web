package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorProductSummaryResponse {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String highlights;
    private String material;
    private String fit;
    private String gender;
    private String careInstructions;
    private String status;
    private Boolean visible;
    private UUID categoryId;
    private String categoryName;
    private BigDecimal basePrice;
    private BigDecimal salePrice;
    private BigDecimal effectivePrice;
    private Integer totalStock;
    private Long soldCount;
    private BigDecimal grossRevenue;
    private String primarySku;
    private String primaryImage;
    private List<VariantRow> variants;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariantRow {
        private UUID id;
        private String sku;
        private String color;
        private String size;
        private Integer stockQuantity;
        private BigDecimal priceAdjustment;
        private Boolean isActive;
    }
}
