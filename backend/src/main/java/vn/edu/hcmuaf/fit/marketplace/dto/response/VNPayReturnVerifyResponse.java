package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class VNPayReturnVerifyResponse {
    private String status;
    private String orderCode;
    private BigDecimal amount;
    private String responseCode;
    private String transactionStatus;
    private boolean orderPaid;
    private String message;
}
