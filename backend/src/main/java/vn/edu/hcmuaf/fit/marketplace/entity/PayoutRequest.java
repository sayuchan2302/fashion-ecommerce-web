package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "payout_requests", indexes = {
        @Index(name = "idx_payout_store", columnList = "store_id"),
        @Index(name = "idx_payout_status", columnList = "status"),
        @Index(name = "idx_payout_created", columnList = "created_at"),
})
public class PayoutRequest extends BaseEntity {

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "bank_account_name", nullable = false)
    private String bankAccountName;

    @Column(name = "bank_account_number", nullable = false)
    private String bankAccountNumber;

    @Column(name = "bank_name", nullable = false)
    private String bankName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PayoutStatus status = PayoutStatus.PENDING;

    @Column(name = "admin_note", columnDefinition = "text")
    private String adminNote;

    @Column(name = "processed_by")
    private UUID processedBy;

    @Column(name = "processed_at")
    private java.time.LocalDateTime processedAt;

    public enum PayoutStatus {
        PENDING, APPROVED, REJECTED
    }
}
