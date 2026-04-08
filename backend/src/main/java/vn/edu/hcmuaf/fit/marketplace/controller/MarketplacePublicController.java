package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceHomeResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceProductCardResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceStoreCardResponse;
import vn.edu.hcmuaf.fit.marketplace.service.MarketplacePublicService;

@RestController
@RequestMapping("/api/public/marketplace")
public class MarketplacePublicController {

    private final MarketplacePublicService marketplacePublicService;

    public MarketplacePublicController(MarketplacePublicService marketplacePublicService) {
        this.marketplacePublicService = marketplacePublicService;
    }

    @GetMapping("/home")
    public ResponseEntity<MarketplaceHomeResponse> getMarketplaceHome() {
        return ResponseEntity.ok(marketplacePublicService.getMarketplaceHome());
    }

    @GetMapping("/search/products")
    public ResponseEntity<Page<MarketplaceProductCardResponse>> searchProducts(
            @RequestParam(name = "q", required = false) String keyword,
            @RequestParam(name = "category", required = false) String categorySlug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(marketplacePublicService.searchProducts(keyword, categorySlug, pageable));
    }

    @GetMapping("/search/stores")
    public ResponseEntity<Page<MarketplaceStoreCardResponse>> searchStores(
            @RequestParam(name = "q", required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(marketplacePublicService.searchStores(keyword, pageable));
    }
}
