package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class VoucherListResponse {
    private List<VoucherResponse> items;
    private long totalElements;
    private int totalPages;
    private int page;
    private int pageSize;
    private long totalUsage;
    private Counts counts;

    @Data
    @Builder
    public static class Counts {
        private long all;
        private long running;
        private long paused;
        private long draft;
    }
}
