package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.dto.request.CategoryRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.CategoryOptionResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.CategoryTreeResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminCategoryResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Category;
import vn.edu.hcmuaf.fit.marketplace.repository.CategoryRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private static final Comparator<Category> CATEGORY_COMPARATOR = Comparator
            .comparing((Category category) -> category.getSortOrder() == null ? Integer.MAX_VALUE : category.getSortOrder())
            .thenComparing(category -> category.getName() == null ? "" : category.getName(), String.CASE_INSENSITIVE_ORDER);

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> findAll() {
        return categoryRepository.findAll();
    }

    public Category findById(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
    }

    private AdminCategoryResponse toAdminCategoryResponse(Category cat) {
        return AdminCategoryResponse.builder()
                .id(cat.getId())
                .name(cat.getName())
                .slug(cat.getSlug())
                .parentId(extractParentId(cat))
                .count(cat.getProducts() != null ? cat.getProducts().size() : 0)
                .status(cat.getIsVisible() != null && !cat.getIsVisible() ? "hidden" : "visible")
                .order(cat.getSortOrder() != null ? cat.getSortOrder() : 1)
                .showOnMenu(Boolean.TRUE.equals(cat.getShowOnMenu()))
                .image(cat.getImage())
                .description(cat.getDescription())
                .build();
    }

    @Transactional(readOnly = true)
    public List<AdminCategoryResponse> getAdminCategories() {
        return getSortedCategories().stream()
                .map(this::toAdminCategoryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryOptionResponse> getOptions(boolean leafOnly) {
        List<Category> categories = getSortedCategories();
        Map<UUID, Category> byId = new HashMap<>();
        Map<UUID, List<Category>> childrenByParentId = new HashMap<>();

        for (Category category : categories) {
            byId.put(category.getId(), category);
            UUID parentId = extractParentId(category);
            childrenByParentId.computeIfAbsent(parentId, ignored -> new ArrayList<>()).add(category);
        }

        for (List<Category> children : childrenByParentId.values()) {
            children.sort(CATEGORY_COMPARATOR);
        }

        List<CategoryOptionResponse> options = new ArrayList<>();
        for (Category category : categories) {
            List<Category> children = childrenByParentId.get(category.getId());
            boolean isLeaf = children == null || children.isEmpty();
            if (leafOnly && !isLeaf) {
                continue;
            }

            options.add(CategoryOptionResponse.builder()
                    .id(category.getId())
                    .name(category.getName())
                    .parentId(extractParentId(category))
                    .label(buildCategoryLabel(category, byId))
                    .leaf(isLeaf)
                    .depth(computeDepth(category, byId))
                    .build());
        }

        options.sort(Comparator.comparing(CategoryOptionResponse::getLabel, String.CASE_INSENSITIVE_ORDER));
        return options;
    }

    @Transactional(readOnly = true)
    public List<CategoryTreeResponse> getTree() {
        List<Category> categories = getSortedCategories();
        Map<UUID, List<Category>> childrenByParentId = new HashMap<>();

        for (Category category : categories) {
            UUID parentId = extractParentId(category);
            childrenByParentId.computeIfAbsent(parentId, ignored -> new ArrayList<>()).add(category);
        }

        for (List<Category> children : childrenByParentId.values()) {
            children.sort(CATEGORY_COMPARATOR);
        }

        List<Category> roots = childrenByParentId.getOrDefault(null, List.of());
        return roots.stream()
                .map(root -> toTreeNode(root, childrenByParentId, new HashSet<>()))
                .toList();
    }

    @Transactional
    public Category create(CategoryRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
        }

        Category category = new Category();
        category.setName(request.getName());
        category.setSlug(request.getSlug());
        category.setDescription(request.getDescription());
        category.setImage(request.getImage());
        category.setSortOrder(request.getSortOrder());
        if (request.getIsVisible() != null) category.setIsVisible(request.getIsVisible());
        if (request.getShowOnMenu() != null) category.setShowOnMenu(request.getShowOnMenu());

        if (request.getParentId() != null) {
            Category parent = findById(request.getParentId());
            category.setParent(parent);
        }

        return categoryRepository.save(category);
    }

    @Transactional
    public Category update(UUID id, CategoryRequest request) {
        Category category = findById(id);

        if (request.getName() != null) category.setName(request.getName());
        if (request.getSlug() != null) category.setSlug(request.getSlug());
        if (request.getDescription() != null) category.setDescription(request.getDescription());
        if (request.getImage() != null) category.setImage(request.getImage());
        if (request.getSortOrder() != null) category.setSortOrder(request.getSortOrder());
        if (request.getIsVisible() != null) category.setIsVisible(request.getIsVisible());
        if (request.getShowOnMenu() != null) category.setShowOnMenu(request.getShowOnMenu());

        if (request.isParentIdProvided()) {
            UUID requestedParentId = request.getParentId();
            if (requestedParentId != null && id.equals(requestedParentId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category cannot be parent of itself");
            }

            if (requestedParentId != null) {
                if (isDescendantParent(requestedParentId, id)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot move category under its own descendant");
                }

                Category parent = findById(requestedParentId);
                category.setParent(parent);
            } else {
                category.setParent(null);
            }
        }

        return categoryRepository.save(category);
    }

    @Transactional
    public AdminCategoryResponse updateAdminStatus(UUID id, boolean isVisible, boolean showOnMenu) {
        Category category = findById(id);
        category.setIsVisible(isVisible);
        category.setShowOnMenu(showOnMenu);
        return toAdminCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(UUID id) {
        if (categoryRepository.existsByParentId(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete category that has child categories");
        }

        Category category = findById(id);
        if (category.getProducts() != null && !category.getProducts().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete category that still has products");
        }
        categoryRepository.delete(category);
    }

    private List<Category> getSortedCategories() {
        List<Category> categories = categoryRepository.findAll();
        categories.sort(CATEGORY_COMPARATOR);
        return categories;
    }

    private UUID extractParentId(Category category) {
        return category.getParent() != null ? category.getParent().getId() : null;
    }

    private String buildCategoryLabel(Category category, Map<UUID, Category> byId) {
        List<String> segments = new ArrayList<>();
        Set<UUID> visited = new HashSet<>();
        Category current = category;

        while (current != null && current.getId() != null && visited.add(current.getId())) {
            if (current.getName() != null && !current.getName().isBlank()) {
                segments.add(0, current.getName().trim());
            }
            UUID parentId = extractParentId(current);
            current = parentId == null ? null : byId.get(parentId);
        }

        return segments.isEmpty() ? "" : String.join(" > ", segments);
    }

    private int computeDepth(Category category, Map<UUID, Category> byId) {
        Set<UUID> visited = new HashSet<>();
        Category current = category;
        int depth = 0;

        while (current != null && current.getId() != null && visited.add(current.getId())) {
            UUID parentId = extractParentId(current);
            if (parentId == null) {
                return depth;
            }
            current = byId.get(parentId);
            depth += 1;
        }

        return depth;
    }

    private CategoryTreeResponse toTreeNode(
            Category category,
            Map<UUID, List<Category>> childrenByParentId,
            Set<UUID> lineage
    ) {
        UUID id = category.getId();
        if (id == null || !lineage.add(id)) {
            return CategoryTreeResponse.builder()
                    .id(category.getId())
                    .name(category.getName())
                    .slug(category.getSlug())
                    .image(category.getImage())
                    .sortOrder(category.getSortOrder())
                    .children(List.of())
                    .build();
        }

        List<CategoryTreeResponse> children = childrenByParentId.getOrDefault(id, List.of()).stream()
                .map(child -> toTreeNode(child, childrenByParentId, new HashSet<>(lineage)))
                .toList();

        return CategoryTreeResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .image(category.getImage())
                .sortOrder(category.getSortOrder())
                .children(children)
                .build();
    }

    private boolean isDescendantParent(UUID candidateParentId, UUID currentCategoryId) {
        Category cursor = findById(candidateParentId);
        Set<UUID> visited = new HashSet<>();

        while (cursor != null && cursor.getId() != null && visited.add(cursor.getId())) {
            if (cursor.getId().equals(currentCategoryId)) {
                return true;
            }

            UUID parentId = extractParentId(cursor);
            if (parentId == null) {
                return false;
            }
            cursor = findById(parentId);
        }

        return false;
    }
}
