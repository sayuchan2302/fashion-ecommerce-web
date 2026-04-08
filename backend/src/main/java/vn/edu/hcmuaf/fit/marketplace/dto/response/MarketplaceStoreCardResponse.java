package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceStoreCardResponse {
    private UUID id;
    private String storeCode;
    private String name;
    private String slug;
    private String logo;
    private Double rating;
    private Integer totalOrders;
    private Integer liveProductCount;
}
