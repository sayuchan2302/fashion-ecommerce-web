package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import vn.edu.hcmuaf.fit.marketplace.entity.ReturnRequest;

@Getter
@Setter
public class ReturnStatusUpdateRequest {
    @NotNull
    private ReturnRequest.ReturnStatus status;
    private String adminNote;
}
