package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CategoryStatusUpdateRequest {
    @NotNull(message = "isVisible cannot be null")
    private Boolean isVisible;
    @NotNull(message = "showOnMenu cannot be null")
    private Boolean showOnMenu;
}
