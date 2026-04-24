package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.util.UploadPathResolver;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class CategoryImageStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Map<String, String> CONTENT_TYPE_TO_EXTENSION = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif"
    );

    private final Path categoryDirectory;
    private final long maxCategoryImageSizeBytes;

    public CategoryImageStorageService(
            @Value("${app.upload.base-dir:backend/upload}") String baseUploadDir,
            @Value("${app.upload.max-category-image-size-bytes:5242880}") long maxCategoryImageSizeBytes
    ) {
        Path basePath = UploadPathResolver.resolveBaseUploadPath(baseUploadDir);
        this.categoryDirectory = basePath.resolve("categories").normalize();
        this.maxCategoryImageSizeBytes = maxCategoryImageSizeBytes;
        try {
            Files.createDirectories(this.categoryDirectory);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot initialize category image upload directory", e);
        }
    }

    public String storeCategoryImage(MultipartFile file) {
        validateFile(file);

        String extension = resolveExtension(file);
        String filename = "category-" + UUID.randomUUID() + "." + extension;
        Path target = categoryDirectory.resolve(filename).normalize();
        if (!target.startsWith(categoryDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid upload path");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot save category image");
        }

        return "/uploads/categories/" + filename;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category image file is required");
        }
        if (file.getSize() > maxCategoryImageSizeBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Category image file is too large");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category image must be an image file");
        }
    }

    private String resolveExtension(MultipartFile file) {
        String original = file.getOriginalFilename();
        if (original != null) {
            int dotIndex = original.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < original.length() - 1) {
                String extension = original.substring(dotIndex + 1).toLowerCase();
                if (ALLOWED_EXTENSIONS.contains(extension)) {
                    return extension;
                }
            }
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String fromContentType = CONTENT_TYPE_TO_EXTENSION.get(contentType);
        if (fromContentType != null) {
            return fromContentType;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported category image format");
    }
}
