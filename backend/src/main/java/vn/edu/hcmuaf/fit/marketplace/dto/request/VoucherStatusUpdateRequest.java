package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import vn.edu.hcmuaf.fit.marketplace.entity.Voucher;

@Data
public class VoucherStatusUpdateRequest {

    @NotNull
    private Voucher.VoucherStatus status;
}
