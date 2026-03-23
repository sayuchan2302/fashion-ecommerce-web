package vn.edu.hcmuaf.fit.fashionstore.entity;

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
@Table(name = "product_variants")
public class ProductVariant extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(unique = true, nullable = false)
    private String sku;

    private String color;

    private String size;

    @Column(name = "stock_quantity")
    private Integer stockQuantity = 0;

    @Column(name = "price_adjustment", precision = 10, scale = 2)
    private Double priceAdjustment = 0.0;

    private Boolean isActive = true;

    public Double getPrice() {
        Double basePrice = product.getEffectivePrice();
        return basePrice + (priceAdjustment != null ? priceAdjustment : 0);
    }
}