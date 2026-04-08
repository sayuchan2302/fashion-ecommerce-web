package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ReviewEligibleItemResponse {
    private UUID orderId;
    private UUID productId;
    private String productName;
    private String productImage;
    private String variantName;
    private Integer quantity;
    private LocalDateTime deliveredAt;
}
