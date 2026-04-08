package vn.edu.hcmuaf.fit.marketplace.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemRequest {
    private UUID productId;
    private UUID variantId;
    private Integer quantity;
}
