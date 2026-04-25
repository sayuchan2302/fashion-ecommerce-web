package vn.edu.hcmuaf.fit.marketplace.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "product_variants")
public class ProductVariant extends BaseEntity {

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(unique = true, nullable = false)
    private String sku;

    private String color;

    @Column(name = "color_hex")
    private String colorHex;

    private String size;

    @Column(name = "stock_quantity")
    private Integer stockQuantity = 0;

    @Column(name = "price_adjustment")
    private BigDecimal priceAdjustment = BigDecimal.ZERO;

    private Boolean isActive = true;

    public BigDecimal getPrice() {
        BigDecimal basePrice = product.getEffectivePrice();
        return basePrice.add(priceAdjustment != null ? priceAdjustment : BigDecimal.ZERO);
    }
}
