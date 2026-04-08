package vn.edu.hcmuaf.fit.marketplace.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.VendorWallet;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VendorWalletRepository extends JpaRepository<VendorWallet, UUID> {
    Optional<VendorWallet> findByStoreId(UUID storeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT vw FROM VendorWallet vw WHERE vw.storeId = :storeId")
    Optional<VendorWallet> findByStoreIdForUpdate(@Param("storeId") UUID storeId);

    @Query(value = """
            SELECT vw.* FROM vendor_wallets vw
            LEFT JOIN stores s ON s.id = vw.store_id
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.slug) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY vw.last_updated DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM vendor_wallets vw
            LEFT JOIN stores s ON s.id = vw.store_id
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.slug) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """,
            nativeQuery = true)
    Page<VendorWallet> searchAll(@Param("keyword") String keyword, Pageable pageable);
}
