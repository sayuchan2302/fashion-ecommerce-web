package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;
import vn.edu.hcmuaf.fit.marketplace.dto.response.VisionCatalogPageResponse;
import vn.edu.hcmuaf.fit.marketplace.service.MarketplacePublicService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/internal/vision")
public class InternalVisionController {

    private static final String SECRET_HEADER = "X-Vision-Internal-Secret";

    private final MarketplacePublicService marketplacePublicService;
    private final VisionSearchProperties visionSearchProperties;

    public InternalVisionController(
            MarketplacePublicService marketplacePublicService,
            VisionSearchProperties visionSearchProperties
    ) {
        this.marketplacePublicService = marketplacePublicService;
        this.visionSearchProperties = visionSearchProperties;
    }

    @GetMapping("/catalog")
    public ResponseEntity<VisionCatalogPageResponse> exportCatalog(
            @RequestHeader(name = SECRET_HEADER, required = false) String secret,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(name = "updatedSince", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime updatedSince
    ) {
        ensureAuthorized(secret);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(marketplacePublicService.exportVisionCatalog(pageable, updatedSince));
    }

    @GetMapping("/catalog/deactivated-products")
    public ResponseEntity<List<UUID>> exportDeactivatedProductIds(
            @RequestHeader(name = SECRET_HEADER, required = false) String secret,
            @RequestParam(name = "updatedSince", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime updatedSince
    ) {
        ensureAuthorized(secret);
        return ResponseEntity.ok(marketplacePublicService.exportVisionDeactivatedProductIds(updatedSince));
    }

    private void ensureAuthorized(String providedSecret) {
        String configured = visionSearchProperties.getInternalSecret();
        if (configured == null || configured.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Vision internal secret is not configured");
        }
        if (providedSecret == null || providedSecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vision internal secret is required");
        }

        boolean matched = MessageDigest.isEqual(
                configured.getBytes(StandardCharsets.UTF_8),
                providedSecret.getBytes(StandardCharsets.UTF_8)
        );
        if (!matched) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid vision internal secret");
        }
    }
}
