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
public class VendorOrderPageResponse {
    private List<VendorOrderSummaryResponse> content;
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
        private long pending;
        private long confirmed;
        private long processing;
        private long shipped;
        private long delivered;
        private long cancelled;
    }
}
