package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProductPriceUpdateRequest {
    @NotNull(message = "price cannot be null")
    private Double price;
}
