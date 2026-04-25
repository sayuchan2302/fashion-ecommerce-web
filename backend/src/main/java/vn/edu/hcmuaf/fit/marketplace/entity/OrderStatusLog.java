package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
@Table(name = "order_status_logs", indexes = {
        @Index(name = "idx_order_status_logs_order", columnList = "order_id, created_at"),
        @Index(name = "idx_order_status_logs_event_type", columnList = "event_type")
})
public class OrderStatusLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(name = "tone", length = 24)
    private String tone;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_from", length = 50)
    private Order.OrderStatus statusFrom;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_to", length = 50)
    private Order.OrderStatus statusTo;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "carrier")
    private String carrier;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;
}

