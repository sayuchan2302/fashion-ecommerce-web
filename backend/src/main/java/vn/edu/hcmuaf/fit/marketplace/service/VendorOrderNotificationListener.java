package vn.edu.hcmuaf.fit.marketplace.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import vn.edu.hcmuaf.fit.marketplace.event.SubOrderReadyForVendorEvent;

@Slf4j
@Component
public class VendorOrderNotificationListener {

    @Async
    @EventListener
    public void onSubOrderReadyForVendor(SubOrderReadyForVendorEvent event) {
        log.info(
                "Vendor notification | storeId={} | subOrderId={} | code={} | paymentMethod={} | message={}",
                event.storeId(),
                event.subOrderId(),
                event.orderCode(),
                event.paymentMethod(),
                event.message()
        );
    }
}
