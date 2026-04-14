package vn.edu.hcmuaf.fit.marketplace.chatbot.service;

import org.junit.jupiter.api.Test;
import vn.edu.hcmuaf.fit.marketplace.entity.Address;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.marketplace.service.OrderService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CustomerSupportChatServiceImplTest {

    @Test
    void lookupOrderStatus_returnsSuccessWhenOrderAndPhoneMatch() {
        StubOrderService orderService = new StubOrderService();
        orderService.order = buildOrder("DH-260412-000037", Order.OrderStatus.SHIPPED, Order.PaymentStatus.PAID, "0901 123 456");
        CustomerSupportChatServiceImpl service = new CustomerSupportChatServiceImpl(orderService);

        CustomerSupportChatService.OrderLookupResult result = service.lookupOrderStatus("dh-260412-000037", "3456");

        assertTrue(result.ok(), result.message());
        assertTrue(result.message().contains("DH-260412-000037"));
        assertTrue(result.message().contains("Đơn đang giao"));
    }

    @Test
    void lookupOrderStatus_returnsFailureWhenPhoneLast4Mismatch() {
        StubOrderService orderService = new StubOrderService();
        orderService.order = buildOrder("DH-260412-000037", Order.OrderStatus.PROCESSING, Order.PaymentStatus.UNPAID, "0901123456");
        CustomerSupportChatServiceImpl service = new CustomerSupportChatServiceImpl(orderService);

        CustomerSupportChatService.OrderLookupResult result = service.lookupOrderStatus("DH-260412-000037", "9999");

        assertFalse(result.ok());
        assertTrue(result.message().contains("Không xác minh được"));
    }

    @Test
    void lookupOrderStatus_returnsFailureWhenOrderNotFound() {
        StubOrderService orderService = new StubOrderService();
        orderService.notFound = true;
        CustomerSupportChatServiceImpl service = new CustomerSupportChatServiceImpl(orderService);

        CustomerSupportChatService.OrderLookupResult result = service.lookupOrderStatus("DH-NOT-FOUND", "1234");

        assertFalse(result.ok());
        assertTrue(result.message().contains("Không tìm thấy đơn hàng"));
    }

    @Test
    void recommendSize_mapsBoundaryRangesCorrectly() {
        CustomerSupportChatServiceImpl service = new CustomerSupportChatServiceImpl(new StubOrderService());

        assertEquals("S", service.recommendSize(155, 50).suggestedSize());
        assertEquals("M", service.recommendSize(165, 58).suggestedSize());
        assertEquals("L", service.recommendSize(172, 67).suggestedSize());
        assertEquals("XL", service.recommendSize(180, 75).suggestedSize());
        assertEquals("XXL", service.recommendSize(188, 85).suggestedSize());
    }

    private Order buildOrder(String code, Order.OrderStatus status, Order.PaymentStatus paymentStatus, String phone) {
        Order order = new Order();
        order.setOrderCode(code);
        order.setStatus(status);
        order.setPaymentStatus(paymentStatus);
        Address address = new Address();
        address.setPhone(phone);
        order.setShippingAddress(address);
        return order;
    }

    private static final class StubOrderService extends OrderService {
        private Order order;
        private boolean notFound;

        private StubOrderService() {
            super(null, null, null, null, null, null, null, null, null, null, null);
        }

        @Override
        public Order findByCode(String code) {
            if (notFound || order == null) {
                throw new ResourceNotFoundException("Order not found");
            }
            return order;
        }
    }
}
