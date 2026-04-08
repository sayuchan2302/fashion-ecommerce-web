package vn.edu.hcmuaf.fit.marketplace.event;

import java.util.UUID;

public record SubOrderReadyForVendorEvent(
        UUID subOrderId,
        UUID storeId,
        String orderCode,
        String paymentMethod,
        String message
) {
}
