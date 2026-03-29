package vn.edu.hcmuaf.fit.fashionstore.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.fashionstore.entity.Review;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {
    Page<Review> findByStatus(Review.ReviewStatus status, Pageable pageable);
    Page<Review> findByStoreId(UUID storeId, Pageable pageable);
    Page<Review> findByStoreIdAndStatus(UUID storeId, Review.ReviewStatus status, Pageable pageable);
    Optional<Review> findByIdAndStoreId(UUID id, UUID storeId);
    List<Review> findByProductIdAndStatusOrderByCreatedAtDesc(UUID productId, Review.ReviewStatus status);
    List<Review> findByStoreIdAndStatusOrderByCreatedAtDesc(UUID storeId, Review.ReviewStatus status);
    List<Review> findByUserIdOrderByCreatedAtDesc(UUID userId);
    boolean existsByUserIdAndProductIdAndOrderId(UUID userId, UUID productId, UUID orderId);

    long countByStoreId(UUID storeId);

    @Query("""
            SELECT COUNT(r) FROM Review r
            WHERE r.storeId = :storeId
              AND r.shopReply IS NOT NULL
              AND TRIM(r.shopReply) <> ''
            """)
    long countByStoreIdWithReply(@Param("storeId") UUID storeId);

    @Query("""
            SELECT COALESCE(AVG(r.rating), 0)
            FROM Review r
            WHERE r.storeId = :storeId
              AND r.status IN ('PENDING', 'APPROVED')
            """)
    Double calculateAverageRatingByStoreId(@Param("storeId") UUID storeId);
}
