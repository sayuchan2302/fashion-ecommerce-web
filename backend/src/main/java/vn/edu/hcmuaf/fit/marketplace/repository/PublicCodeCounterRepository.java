package vn.edu.hcmuaf.fit.marketplace.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.PublicCodeCounter;
import vn.edu.hcmuaf.fit.marketplace.entity.PublicCodeType;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PublicCodeCounterRepository extends JpaRepository<PublicCodeCounter, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PublicCodeCounter> findByCodeTypeAndCodeDate(PublicCodeType codeType, LocalDate codeDate);
}
