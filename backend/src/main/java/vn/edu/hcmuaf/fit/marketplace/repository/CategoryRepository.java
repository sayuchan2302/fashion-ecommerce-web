package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.Category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    Optional<Category> findBySlug(String slug);
    Optional<Category> findBySlugIgnoreCase(String slug);

    List<Category> findByParentIsNullOrderBySortOrder();

    Page<Category> findByParentId(UUID parentId, Pageable pageable);

    boolean existsByParentId(UUID parentId);

    long countByIsVisibleFalse();
}
