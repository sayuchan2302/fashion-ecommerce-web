package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceHomeResponse {
    private List<MarketplaceStoreCardResponse> featuredStores;
    private List<MarketplaceProductCardResponse> featuredProducts;
    private List<MarketplaceProductCardResponse> trendingProducts;
    private LocalDateTime generatedAt;
}
