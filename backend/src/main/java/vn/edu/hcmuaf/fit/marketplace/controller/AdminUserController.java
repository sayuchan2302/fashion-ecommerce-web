package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminUserResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.service.AdminUserService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ResponseEntity<List<AdminUserResponse>> listUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) User.Role role,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(adminUserService.listUsers(q, role, status));
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<AdminUserResponse> updateUserActive(
            @PathVariable UUID id,
            @RequestBody ActiveUpdateRequest request
    ) {
        if (request == null || request.getActive() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "active is required");
        }
        return ResponseEntity.ok(adminUserService.updateUserActive(id, request.getActive()));
    }

    public static class ActiveUpdateRequest {
        private Boolean active;

        public Boolean getActive() {
            return active;
        }

        public void setActive(Boolean active) {
            this.active = active;
        }
    }
}
