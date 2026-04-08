package vn.edu.hcmuaf.fit.marketplace.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.Coupon;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, UUID> {

    Optional<Coupon> findByCode(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c FROM Coupon c
            WHERE UPPER(c.code) = UPPER(:code)
            """)
    Optional<Coupon> findByCodeForUpdate(@Param("code") String code);

    List<Coupon> findByIsActiveTrue();

    List<Coupon> findByIsActiveTrueAndExpiresAtAfter(java.time.LocalDateTime now);
}
