package vn.edu.hcmuaf.fit.fashionstore.dto.response;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hcmuaf.fit.fashionstore.entity.WalletTransaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class WalletTransactionResponse {
    private UUID id;
    private String code;
    private UUID walletId;
    private UUID orderId;
    private BigDecimal amount;
    private WalletTransaction.TransactionType type;
    private String description;
    private LocalDateTime createdAt;
}
