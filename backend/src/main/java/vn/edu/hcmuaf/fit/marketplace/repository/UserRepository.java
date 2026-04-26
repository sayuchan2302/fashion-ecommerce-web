package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.cart WHERE u.id = :id")
    Optional<User> findByIdWithCart(UUID id);

    long countByIsActiveFalse();

    long countByRole(User.Role role);

    @Query("""
            SELECT u.id
            FROM User u
            WHERE u.role = :role
              AND u.isActive = true
            """)
    List<UUID> findIdsByRoleAndIsActiveTrue(@Param("role") User.Role role);

    @Query("""
            SELECT DISTINCT u.id
            FROM User u
            WHERE u.role = :role
              AND u.isActive = true
              AND (
                    u.createdAt >= :cutoff
                    OR EXISTS (
                        SELECT 1
                        FROM Order o
                        WHERE o.user = u
                          AND o.parentOrder IS NULL
                          AND o.createdAt >= :cutoff
                    )
              )
            """)
    List<UUID> findActiveCustomerIdsForPromotion(
            @Param("role") User.Role role,
            @Param("cutoff") LocalDateTime cutoff
    );
}
