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
@Table(name = "notifications")
public class Notification extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private NotificationType type = NotificationType.SYSTEM;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String message;

    private String image;

    private String link;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public enum NotificationType {
        ORDER, PROMOTION, REVIEW, SYSTEM
    }
}
