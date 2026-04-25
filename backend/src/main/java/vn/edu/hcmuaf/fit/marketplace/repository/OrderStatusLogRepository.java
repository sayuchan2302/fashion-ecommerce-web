package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.OrderStatusLog;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderStatusLogRepository extends JpaRepository<OrderStatusLog, UUID> {
    List<OrderStatusLog> findByOrderIdInOrderByCreatedAtAsc(List<UUID> orderIds);
}

