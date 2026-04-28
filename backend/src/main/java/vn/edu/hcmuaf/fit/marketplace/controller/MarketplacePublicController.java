package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceFlashSaleResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceHomeResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceImageSearchResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceProductCardResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MarketplaceStoreCardResponse;
import vn.edu.hcmuaf.fit.marketplace.service.MarketplacePublicService;
import org.springframework.web.multipart.MultipartFile;

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

    @GetMapping("/flash-sale/active")
    public ResponseEntity<MarketplaceFlashSaleResponse> getActiveFlashSale() {
        return ResponseEntity.ok(marketplacePublicService.getActiveFlashSale());
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

    @PostMapping(value = "/search/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MarketplaceImageSearchResponse> searchProductsByImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "limit", defaultValue = "120") int limit,
            @RequestParam(name = "category", required = false) String categorySlug,
            @RequestParam(name = "store", required = false) String storeSlug
    ) {
        return ResponseEntity.ok(marketplacePublicService.searchProductsByImage(file, limit, categorySlug, storeSlug));
    }
}
