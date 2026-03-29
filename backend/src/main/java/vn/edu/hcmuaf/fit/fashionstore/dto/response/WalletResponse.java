package vn.edu.hcmuaf.fit.fashionstore.dto.response;

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
    private BigDecimal balance;
    private LocalDateTime lastUpdated;
}
