package vn.edu.hcmuaf.fit.fashionstore.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "coupons")
public class Coupon extends BaseEntity {

    @Column(unique = true, nullable = false)
    private String code;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 20)
    private DiscountType discountType;

    @Column(name = "discount_value", precision = 10, scale = 2)
    private Double discountValue;

    @Column(name = "min_order_amount", precision = 10, scale = 2)
    private Double minOrderAmount;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "used_count")
    private Integer usedCount = 0;

    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "is_active")
    private Boolean isActive = true;

    private Integer maxUsesPerUser;

    public enum DiscountType {
        PERCENT, FIXED
    }

    public boolean isValid() {
        if (!isActive) return false;
        if (maxUses != null && usedCount >= maxUses) return false;
        LocalDateTime now = LocalDateTime.now();
        if (startsAt != null && now.isBefore(startsAt)) return false;
        if (expiresAt != null && now.isAfter(expiresAt)) return false;
        return true;
    }

    public Double calculateDiscount(Double orderAmount) {
        if (!isValid() || (minOrderAmount != null && orderAmount < minOrderAmount)) {
            return 0.0;
        }
        if (discountType == DiscountType.PERCENT) {
            return orderAmount * discountValue / 100;
        } else {
            return Math.min(discountValue, orderAmount);
        }
    }
}