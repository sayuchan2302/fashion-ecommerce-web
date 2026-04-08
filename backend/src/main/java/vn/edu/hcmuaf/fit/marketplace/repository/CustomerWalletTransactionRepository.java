package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.CustomerWalletTransaction;

import java.math.BigDecimal;
import java.util.UUID;

@Repository
public interface CustomerWalletTransactionRepository extends JpaRepository<CustomerWalletTransaction, UUID> {
    boolean existsByReturnRequestIdAndType(UUID returnRequestId, CustomerWalletTransaction.TransactionType type);

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM CustomerWalletTransaction t
            WHERE t.orderId = :orderId
              AND t.type = :type
            """)
    BigDecimal sumAmountByOrderIdAndType(
            @Param("orderId") UUID orderId,
            @Param("type") CustomerWalletTransaction.TransactionType type
    );
}
