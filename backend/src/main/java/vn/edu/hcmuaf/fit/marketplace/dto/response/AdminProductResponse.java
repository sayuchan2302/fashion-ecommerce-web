package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AdminProductResponse {
    private UUID id;
    private String sku;
    private String name;
    private String category;
    private Double price;
    private Integer stock;
    private String status;
    private String statusType;
    private String variants;
    private String thumb;
    private List<AdminVariantResponse> variantMatrix;
    private List<InventoryLedgerResponse> inventoryLedger;
    private Integer version;
    private LocalDateTime updatedAt;
}
