package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "commission_tiers")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class CommissionTier extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "rate", nullable = false)
    private BigDecimal rate;

    @Column(name = "min_monthly_revenue")
    private Long minMonthlyRevenue;

    @Column(name = "min_order_count")
    private Integer minOrderCount;

    @Column(name = "is_default")
    private Boolean isDefault = false;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}
