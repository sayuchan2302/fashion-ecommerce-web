package vn.edu.hcmuaf.fit.marketplace.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.FlashSaleCampaign;
import vn.edu.hcmuaf.fit.marketplace.entity.FlashSaleItem;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlashSaleItemRepository extends JpaRepository<FlashSaleItem, UUID> {

    @Query("""
            SELECT i
            FROM FlashSaleItem i
            JOIN i.campaign c
            WHERE c.id = :campaignId
              AND c.status = :campaignStatus
              AND i.status = :itemStatus
              AND c.startAt <= :now
              AND c.endAt >= :now
              AND COALESCE(i.soldCount, 0) < COALESCE(i.quota, 0)
            ORDER BY COALESCE(i.sortOrder, 0) ASC, i.createdAt DESC
            """)
    List<FlashSaleItem> findPublicActiveByCampaignId(
            @Param("campaignId") UUID campaignId,
            @Param("campaignStatus") FlashSaleCampaign.CampaignStatus campaignStatus,
            @Param("itemStatus") FlashSaleItem.ItemStatus itemStatus,
            @Param("now") LocalDateTime now
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT i
            FROM FlashSaleItem i
            JOIN i.campaign c
            WHERE i.product.id = :productId
              AND i.variant.id = :variantId
              AND i.status = :itemStatus
              AND c.status = :campaignStatus
              AND c.startAt <= :now
              AND c.endAt >= :now
            ORDER BY c.startAt DESC, i.createdAt DESC
            """)
    List<FlashSaleItem> findActiveVariantItemForUpdate(
            @Param("productId") UUID productId,
            @Param("variantId") UUID variantId,
            @Param("itemStatus") FlashSaleItem.ItemStatus itemStatus,
            @Param("campaignStatus") FlashSaleCampaign.CampaignStatus campaignStatus,
            @Param("now") LocalDateTime now
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT i
            FROM FlashSaleItem i
            JOIN i.campaign c
            WHERE i.product.id = :productId
              AND i.variant IS NULL
              AND i.status = :itemStatus
              AND c.status = :campaignStatus
              AND c.startAt <= :now
              AND c.endAt >= :now
            ORDER BY c.startAt DESC, i.createdAt DESC
            """)
    List<FlashSaleItem> findActiveProductItemForUpdate(
            @Param("productId") UUID productId,
            @Param("itemStatus") FlashSaleItem.ItemStatus itemStatus,
            @Param("campaignStatus") FlashSaleCampaign.CampaignStatus campaignStatus,
            @Param("now") LocalDateTime now
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT i
            FROM FlashSaleItem i
            WHERE i.id = :id
            """)
    Optional<FlashSaleItem> findByIdForUpdate(@Param("id") UUID id);

    @Modifying
    @Query("""
            DELETE FROM FlashSaleItem i
            WHERE i.product.id IN :productIds
            """)
    int deleteByProductIds(@Param("productIds") List<UUID> productIds);

    @Modifying
    @Query("""
            DELETE FROM FlashSaleItem i
            WHERE i.variant IS NOT NULL
              AND i.variant.id IN :variantIds
            """)
    int deleteByVariantIds(@Param("variantIds") List<UUID> variantIds);
}
