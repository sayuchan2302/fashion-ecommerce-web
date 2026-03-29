package vn.edu.hcmuaf.fit.fashionstore.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.StoreRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.StoreResponse;
import vn.edu.hcmuaf.fit.fashionstore.security.JwtService;
import vn.edu.hcmuaf.fit.fashionstore.service.StoreService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;
    private final JwtService jwtService;

    public StoreController(StoreService storeService, JwtService jwtService) {
        this.storeService = storeService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<StoreResponse> registerStore(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody StoreRequest request) {
        UUID userId = UUID.fromString(jwtService.extractUserId(authHeader.replace("Bearer ", "")));
        return ResponseEntity.ok(storeService.registerStore(userId, request));
    }

    @GetMapping("/my-store")
    public ResponseEntity<StoreResponse> getMyStore(@RequestHeader("Authorization") String authHeader) {
        UUID userId = UUID.fromString(jwtService.extractUserId(authHeader.replace("Bearer ", "")));
        return storeService.findStoreByOwner(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StoreResponse> getStoreById(@PathVariable UUID id) {
        return ResponseEntity.ok(storeService.getStoreById(id));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<StoreResponse> getStoreBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(storeService.getStoreBySlug(slug));
    }

    @GetMapping
    public ResponseEntity<List<StoreResponse>> getActiveStores() {
        return ResponseEntity.ok(storeService.getAllActiveStores());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<StoreResponse>> getAllStoresForAdmin() {
        return ResponseEntity.ok(storeService.getAllStoresForAdmin());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<StoreResponse>> getPendingStores() {
        return ResponseEntity.ok(storeService.getPendingStores());
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<StoreResponse> approveStore(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String authHeader) {
        String adminEmail = jwtService.extractUsername(authHeader.replace("Bearer ", ""));
        return ResponseEntity.ok(storeService.approveStore(id, adminEmail));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<StoreResponse> rejectStore(
            @PathVariable UUID id,
            @RequestBody RejectRequest request) {
        return ResponseEntity.ok(storeService.rejectStore(id, request.getReason()));
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<StoreResponse> suspendStore(@PathVariable UUID id) {
        return ResponseEntity.ok(storeService.suspendStore(id));
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<StoreResponse> reactivateStore(@PathVariable UUID id) {
        return ResponseEntity.ok(storeService.reactivateStore(id));
    }

    @PutMapping("/my-store")
    public ResponseEntity<StoreResponse> updateStore(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody StoreRequest request) {
        UUID userId = UUID.fromString(jwtService.extractUserId(authHeader.replace("Bearer ", "")));
        return ResponseEntity.ok(storeService.updateStore(userId, request));
    }

    public static class RejectRequest {
        private String reason;

        public RejectRequest() {}

        public RejectRequest(String reason) {
            this.reason = reason;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }
}
