package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.InventoryLedger;

import java.util.UUID;

@Repository
public interface InventoryLedgerRepository extends JpaRepository<InventoryLedger, UUID> {
    Page<InventoryLedger> findByProductSkuOrderByCreatedAtDesc(String productSku, Pageable pageable);
}
