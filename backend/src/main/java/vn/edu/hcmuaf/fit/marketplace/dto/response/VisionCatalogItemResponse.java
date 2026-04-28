package vn.edu.hcmuaf.fit.marketplace.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisionCatalogItemResponse {
    @JsonProperty("backend_product_id")
    private UUID backendProductId;

    @JsonProperty("product_slug")
    private String productSlug;

    @JsonProperty("store_id")
    private UUID storeId;

    @JsonProperty("store_slug")
    private String storeSlug;

    @JsonProperty("category_slug")
    private String categorySlug;

    @JsonProperty("image_url")
    private String imageUrl;

    @JsonProperty("image_index")
    private Integer imageIndex;

    @JsonProperty("is_primary")
    private Boolean isPrimary;

    @JsonProperty("source_updated_at")
    private LocalDateTime sourceUpdatedAt;
}
