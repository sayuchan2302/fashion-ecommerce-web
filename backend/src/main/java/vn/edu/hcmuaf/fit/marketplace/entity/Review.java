package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "reviews")
public class Review extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "store_id")
    private UUID storeId;

    @Column(nullable = false)
    private Integer rating;

    private String title;

    @Column(columnDefinition = "text", nullable = false)
    private String content;

    @ElementCollection
    @CollectionTable(name = "review_images", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "image_url")
    private List<String> images = new ArrayList<>();

    private Integer helpful = 0;

    @Column(name = "shop_reply", columnDefinition = "text")
    private String shopReply;

    @Column(name = "shop_reply_at")
    private LocalDateTime shopReplyAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReviewStatus status = ReviewStatus.PENDING;

    private Integer version = 0;

    public enum ReviewStatus {
        PENDING, APPROVED, REJECTED, HIDDEN
    }
}
