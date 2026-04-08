package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import vn.edu.hcmuaf.fit.marketplace.entity.Voucher;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class VoucherRequest {

    private UUID storeId;

    @NotBlank
    private String name;

    @NotBlank
    private String code;

    private String description;

    @NotNull
    private Voucher.DiscountType discountType;

    @NotNull
    @DecimalMin("0.01")
    @DecimalMax("999999999")
    private BigDecimal discountValue;

    @Min(value = 0, message = "Minimum order value cannot be negative")
    private BigDecimal minOrderValue;

    @NotNull
    @Min(1)
    private Integer totalIssued;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private Voucher.VoucherStatus status;
}
