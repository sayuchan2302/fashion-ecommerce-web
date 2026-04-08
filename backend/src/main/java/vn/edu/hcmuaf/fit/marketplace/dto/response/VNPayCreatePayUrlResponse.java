package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class VNPayCreatePayUrlResponse {
    private String paymentUrl;
    private String orderCode;
    private String txnRef;
    private LocalDateTime expiresAt;
}
