package vn.edu.hcmuaf.fit.marketplace.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest {
    private UUID addressId;
    private String paymentMethod;
    private UUID customerVoucherId;
    private String couponCode;
    private String note;
    private List<OrderItemRequest> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {
        private UUID productId;
        private UUID variantId;
        private Integer quantity;
        private BigDecimal unitPrice;
    }
}
