package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorProductPageResponse {
    private List<VendorProductSummaryResponse> content;
    private long totalElements;
    private int totalPages;
    private int number;
    private int size;
    private StatusCounts statusCounts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusCounts {
        private long all;
        private long active;
        private long draft;
        private long outOfStock;
        private long lowStock;
    }
}
