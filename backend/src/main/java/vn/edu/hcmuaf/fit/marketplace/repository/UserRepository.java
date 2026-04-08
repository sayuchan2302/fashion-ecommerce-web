package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.User;

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
}
