package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.marketplace.dto.request.ContentPageReorderRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.request.ContentPageRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.ContentPageResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.ContentPage;
import vn.edu.hcmuaf.fit.marketplace.repository.ContentPageRepository;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class ContentPageService {

    private final ContentPageRepository contentPageRepository;

    public ContentPageService(ContentPageRepository contentPageRepository) {
        this.contentPageRepository = contentPageRepository;
    }

    @Transactional(readOnly = true)
    public List<ContentPageResponse> list(ContentPage.ContentType type) {
        return contentPageRepository.findByTypeOrderByDisplayOrderAscUpdatedAtDesc(type).stream()
                .sorted(Comparator.comparing(ContentPage::getDisplayOrder, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(ContentPage::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ContentPageResponse create(ContentPageRequest request, String updatedBy) {
        ContentPage page = ContentPage.builder()
                .title(request.getTitle())
                .body(request.getBody())
                .type(request.getType())
                .displayOrder(request.getDisplayOrder())
                .updatedBy(updatedBy)
                .build();
        return toResponse(contentPageRepository.save(page));
    }

    @Transactional
    public ContentPageResponse update(UUID id, ContentPageRequest request, String updatedBy) {
        ContentPage page = contentPageRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Content not found"));
        page.setTitle(request.getTitle());
        page.setBody(request.getBody());
        page.setType(request.getType());
        page.setDisplayOrder(request.getDisplayOrder());
        page.setUpdatedBy(updatedBy);
        return toResponse(contentPageRepository.save(page));
    }

    @Transactional
    public void delete(UUID id) {
        contentPageRepository.deleteById(id);
    }

    @Transactional
    public void reorder(ContentPageReorderRequest payload) {
        payload.getItems().forEach(item -> {
            contentPageRepository.findById(item.getId()).ifPresent(page -> {
                page.setDisplayOrder(item.getDisplayOrder());
                contentPageRepository.save(page);
            });
        });
    }

    private ContentPageResponse toResponse(ContentPage page) {
        return ContentPageResponse.builder()
                .id(page.getId())
                .title(page.getTitle())
                .body(page.getBody())
                .type(page.getType())
                .displayOrder(page.getDisplayOrder())
                .updatedAt(page.getUpdatedAt())
                .updatedBy(page.getUpdatedBy())
                .build();
    }
}
