package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StockAdjustmentRequest {
    @NotNull(message = "SKU cannot be null")
    private String sku;
    
    @NotNull(message = "before field cannot be null")
    private Integer before;
    
    @NotNull(message = "after field cannot be null")
    private Integer after;
    
    @NotNull(message = "suggestedReason cannot be null")
    private String suggestedReason;
}
