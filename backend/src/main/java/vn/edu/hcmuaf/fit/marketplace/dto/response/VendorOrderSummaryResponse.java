package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorOrderSummaryResponse {
    private UUID id;
    private String code;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private BigDecimal total;
    private BigDecimal commissionFee;
    private BigDecimal vendorPayout;
    private Integer itemCount;
    private Customer customer;
    private String trackingNumber;
    private String shippingCarrier;
    private String warehouseNote;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Customer {
        private String name;
        private String email;
        private String phone;
    }
}
