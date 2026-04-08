package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hcmuaf.fit.marketplace.entity.ContentPage;

import java.util.List;
import java.util.UUID;

public interface ContentPageRepository extends JpaRepository<ContentPage, UUID> {
    List<ContentPage> findByTypeOrderByDisplayOrderAscUpdatedAtDesc(ContentPage.ContentType type);
}
