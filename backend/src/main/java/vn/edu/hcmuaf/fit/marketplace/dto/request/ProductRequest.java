package vn.edu.hcmuaf.fit.marketplace.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {
    private String name;
    private String slug;
    private String description;
    private String sizeAndFit;
    private String fabricAndCare;
    private String highlights;
    private String careInstructions;
    private UUID categoryId;
    private BigDecimal basePrice;
    private BigDecimal salePrice;
    private String material;
    private String fit;
    private String gender;
    private String status;
    private String sku;
    private Integer stockQuantity;
    private String imageUrl;
    private List<String> imageUrls;
    private List<VariantRequest> variants;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariantRequest {
        private String sku;
        private String color;
        private String colorHex;
        private String size;
        private Integer stockQuantity;
        private BigDecimal priceAdjustment;
        private Boolean isActive;
    }
}
