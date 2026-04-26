package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "customer_vouchers",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_customer_voucher_user_voucher", columnNames = {"user_id", "voucher_id"})
        }
)
public class CustomerVoucher extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id", nullable = false)
    private Voucher voucher;

    @Enumerated(EnumType.STRING)
    @Column(name = "wallet_status", nullable = false, length = 20)
    private WalletStatus walletStatus = WalletStatus.AVAILABLE;

    @Enumerated(EnumType.STRING)
    @Column(name = "claim_source", nullable = false, length = 20)
    private ClaimSource claimSource = ClaimSource.STORE_CLAIM;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "used_order_id")
    private UUID usedOrderId;

    public enum WalletStatus {
        AVAILABLE,
        USED,
        REVOKED
    }

    public enum ClaimSource {
        ADMIN_AUTO,
        FOLLOW_AUTO,
        STORE_CLAIM
    }
}
