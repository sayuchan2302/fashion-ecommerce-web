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
public class CustomerVoucherListResponse {

    private List<CustomerVoucherResponse> items;
    private long totalElements;
    private int totalPages;
    private int page;
    private int pageSize;
}
