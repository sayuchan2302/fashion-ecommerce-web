package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inventory_ledger")
public class InventoryLedger extends BaseEntity {

    @Column(name = "product_sku", nullable = false)
    private String productSku;

    @Column(nullable = false)
    private String actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InventorySource source;

    private String reason;

    private Integer delta;

    @Column(name = "before_stock")
    private Integer beforeStock;

    @Column(name = "after_stock")
    private Integer afterStock;

    public enum InventorySource {
        MANUAL_ADJUSTMENT, VARIANT_SYNC, BULK_ACTION, ORDER_PLACEMENT, ORDER_CANCELLATION
    }
}
