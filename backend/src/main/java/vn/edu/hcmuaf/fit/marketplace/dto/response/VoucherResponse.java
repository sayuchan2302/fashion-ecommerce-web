package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;
import vn.edu.hcmuaf.fit.marketplace.entity.Voucher;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class VoucherResponse {
    private UUID id;
    private UUID storeId;
    private String storeName;
    private String name;
    private String code;
    private String description;
    private Voucher.DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;
    private Integer totalIssued;
    private Integer usedCount;
    private Voucher.VoucherStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
