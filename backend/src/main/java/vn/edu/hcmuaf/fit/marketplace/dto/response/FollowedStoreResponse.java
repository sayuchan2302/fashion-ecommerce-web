package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowedStoreResponse {
    private UUID storeId;
    private String storeName;
    private String storeSlug;
    private String storeLogo;
    private Double rating;
    private Integer totalOrders;
    private Long followerCount;
    private LocalDateTime followedAt;
}
