package vn.edu.hcmuaf.fit.fashionstore.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ProductPriceUpdateRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.StockAdjustmentRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.AdminProductResponse;
import vn.edu.hcmuaf.fit.fashionstore.service.AdminProductService;

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminProductController {

    private final AdminProductService adminProductService;

    @GetMapping
    public ResponseEntity<Page<AdminProductResponse>> getAllProducts(Pageable pageable) {
        return ResponseEntity.ok(adminProductService.getAdminProducts(pageable));
    }

    @GetMapping("/{sku}")
    public ResponseEntity<AdminProductResponse> getProductBySku(@PathVariable String sku) {
        return ResponseEntity.ok(adminProductService.getProductBySku(sku));
    }

    @PostMapping("/adjust-stock")
    public ResponseEntity<Void> adjustStock(@RequestBody StockAdjustmentRequest request, Authentication authentication) {
        String actor = authentication != null ? authentication.getName() : "system";
        adminProductService.adjustStock(request, actor);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{sku}/price")
    public ResponseEntity<Void> updatePrice(@PathVariable String sku, @RequestBody ProductPriceUpdateRequest request) {
        adminProductService.updatePrice(sku, request.getPrice());
        return ResponseEntity.ok().build();
    }
}
