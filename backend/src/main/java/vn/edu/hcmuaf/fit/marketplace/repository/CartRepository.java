package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.Cart;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CartRepository extends JpaRepository<Cart, UUID> {

    @Query("""
            SELECT DISTINCT c
            FROM Cart c
            LEFT JOIN FETCH c.items i
            LEFT JOIN FETCH i.product
            LEFT JOIN FETCH i.variant
            WHERE c.user.id = :userId
            """)
    Optional<Cart> findByUserIdWithItems(UUID userId);

    Optional<Cart> findByUserId(UUID userId);
}
