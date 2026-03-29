package vn.edu.hcmuaf.fit.fashionstore.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ReturnStatusUpdateRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ReturnSubmitRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.ReturnRequestResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.ReturnRequest;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext;
import vn.edu.hcmuaf.fit.fashionstore.service.ReturnRequestService;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/returns")
public class ReturnRequestController {

    private final ReturnRequestService returnRequestService;
    private final AuthContext authContext;

    public ReturnRequestController(ReturnRequestService returnRequestService, AuthContext authContext) {
        this.returnRequestService = returnRequestService;
        this.authContext = authContext;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReturnRequestResponse> submit(@Valid @RequestBody ReturnSubmitRequest request,
                                                        @RequestHeader("Authorization") String authHeader) {
        UUID userId = authContext.fromAuthHeader(authHeader).getUserId();
        return ResponseEntity.ok(returnRequestService.submit(userId, request));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<ReturnRequestResponse>> list(
            @RequestParam(value = "status", required = false) ReturnRequest.ReturnStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(size, 100));
        return ResponseEntity.ok(returnRequestService.list(status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ReturnRequestResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(returnRequestService.get(id));
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ReturnRequestResponse> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(returnRequestService.getByCode(code));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ReturnRequestResponse> updateStatus(@PathVariable UUID id,
                                                              @Valid @RequestBody ReturnStatusUpdateRequest request,
                                                              Principal principal) {
        return ResponseEntity.ok(returnRequestService.updateStatus(
                id,
                request,
                principal != null ? principal.getName() : null
        ));
    }
}
