package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InventoryLedgerResponse {
    private String id;
    private String at;
    private String actor;
    private String source;
    private String reason;
    private Integer delta;
    private Integer beforeStock;
    private Integer afterStock;
}
