package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorTopProductResponse {
    private UUID productId;
    private String productName;
    private String productImage;
    private long soldCount;
    private BigDecimal grossRevenue;
}
