package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.marketplace.dto.request.CategoryRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.request.CategoryStatusUpdateRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminCategoryResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.CategoryOptionResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.CategoryTreeResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Category;
import vn.edu.hcmuaf.fit.marketplace.service.CategoryService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ResponseEntity<List<Category>> getAll() {
        return ResponseEntity.ok(categoryService.findAll());
    }

    @GetMapping("/options")
    public ResponseEntity<List<CategoryOptionResponse>> getOptions(
            @RequestParam(name = "leafOnly", defaultValue = "false") boolean leafOnly
    ) {
        return ResponseEntity.ok(categoryService.getOptions(leafOnly));
    }

    @GetMapping("/tree")
    public ResponseEntity<List<CategoryTreeResponse>> getTree() {
        return ResponseEntity.ok(categoryService.getTree());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(categoryService.findById(id));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<AdminCategoryResponse>> getAdminAll() {
        return ResponseEntity.ok(categoryService.getAdminCategories());
    }

    @PostMapping("/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Category> create(@RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.create(request));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Category> update(@PathVariable UUID id, @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.update(id, request));
    }

    @PatchMapping("/admin/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AdminCategoryResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody CategoryStatusUpdateRequest request) {
        return ResponseEntity.ok(categoryService.updateAdminStatus(id, request.getIsVisible(), request.getShowOnMenu()));
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        categoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
