package vn.edu.hcmuaf.fit.fashionstore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.fashionstore.entity.WalletTransaction;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {
    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(UUID walletId);
    Page<WalletTransaction> findByWalletId(UUID walletId, Pageable pageable);
    boolean existsByOrderIdAndType(UUID orderId, WalletTransaction.TransactionType type);
    Optional<WalletTransaction> findTopByTransactionCodeStartingWithOrderByTransactionCodeDesc(String transactionCodePrefix);
    List<WalletTransaction> findByTransactionCodeIsNullOrderByCreatedAtAscIdAsc();
}
