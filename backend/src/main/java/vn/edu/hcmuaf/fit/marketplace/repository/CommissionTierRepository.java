package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.CommissionTier;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommissionTierRepository extends JpaRepository<CommissionTier, UUID> {

    Optional<CommissionTier> findBySlug(String slug);

    Optional<CommissionTier> findByIsDefaultTrue();

    List<CommissionTier> findByIsActiveTrueOrderBySortOrderAsc();

    boolean existsBySlugAndIdNot(String slug, UUID id);
}
