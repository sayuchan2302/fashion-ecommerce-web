package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "loyalty_points")
public class LoyaltyPoint extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "total_points")
    private Integer totalPoints = 0;

    @Column(name = "available_points")
    private Integer availablePoints = 0;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Tier tier = Tier.BRONZE;

    @Column(name = "total_spent")
    private Double totalSpent = 0.0;

    public enum Tier {
        BRONZE, SILVER, GOLD, PLATINUM, DIAMOND
    }

    public void addPoints(int points) {
        this.totalPoints += points;
        this.availablePoints += points;
    }

    public void deductPoints(int points) {
        if (this.availablePoints >= points) {
            this.availablePoints -= points;
        }
    }

    public void updateTier() {
        this.tier = calculateTier(this.totalPoints);
    }

    public static Tier calculateTier(int points) {
        if (points >= 10000) return Tier.DIAMOND;
        if (points >= 5000) return Tier.PLATINUM;
        if (points >= 2000) return Tier.GOLD;
        if (points >= 500) return Tier.SILVER;
        return Tier.BRONZE;
    }
}
