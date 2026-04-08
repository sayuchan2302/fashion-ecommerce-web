package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class WalletResponse {
    private UUID id;
    private UUID storeId;
    private String storeName;
    private String storeSlug;
    private BigDecimal availableBalance;
    private BigDecimal frozenBalance;
    private BigDecimal reservedBalance;
    private BigDecimal totalBalance;
    private LocalDateTime lastUpdated;
}
