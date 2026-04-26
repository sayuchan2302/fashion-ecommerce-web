package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.edu.hcmuaf.fit.marketplace.entity.CustomerVoucher;
import vn.edu.hcmuaf.fit.marketplace.entity.Voucher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerVoucherResponse {

    private UUID id;
    private UUID userId;
    private UUID voucherId;
    private UUID storeId;
    private String storeName;

    private String name;
    private String code;
    private String description;
    private Voucher.DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;

    private Integer totalIssued;
    private Integer usedCount;

    private Voucher.VoucherStatus voucherStatus;
    private LocalDate startDate;
    private LocalDate endDate;

    private CustomerVoucher.WalletStatus walletStatus;
    private WalletDisplayStatus displayStatus;
    private CustomerVoucher.ClaimSource claimSource;
    private LocalDateTime claimedAt;
    private LocalDateTime usedAt;
    private UUID usedOrderId;

    public enum WalletDisplayStatus {
        AVAILABLE,
        USED,
        EXPIRED,
        REVOKED
    }
}
