package vn.edu.hcmuaf.fit.marketplace.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.marketplace.dto.request.ContentPageReorderRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.request.ContentPageRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.ContentPageResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.ContentPage;
import vn.edu.hcmuaf.fit.marketplace.service.ContentPageService;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/content")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class ContentPageController {

    private final ContentPageService contentPageService;

    public ContentPageController(ContentPageService contentPageService) {
        this.contentPageService = contentPageService;
    }

    @GetMapping
    public ResponseEntity<List<ContentPageResponse>> list(@RequestParam("type") ContentPage.ContentType type) {
        return ResponseEntity.ok(contentPageService.list(type));
    }

    @PostMapping
    public ResponseEntity<ContentPageResponse> create(@Valid @RequestBody ContentPageRequest request, Principal principal) {
        return ResponseEntity.ok(contentPageService.create(request, principal != null ? principal.getName() : null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContentPageResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody ContentPageRequest request,
            Principal principal
    ) {
        return ResponseEntity.ok(contentPageService.update(id, request, principal != null ? principal.getName() : null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        contentPageService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorder(@Valid @RequestBody ContentPageReorderRequest request) {
        contentPageService.reorder(request);
        return ResponseEntity.noContent().build();
    }
}
