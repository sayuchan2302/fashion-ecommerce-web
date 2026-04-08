package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminVariantResponse {
    private String id;
    private String size;
    private String color;
    private String sku;
    private Double price;
    private Integer stock;
}
