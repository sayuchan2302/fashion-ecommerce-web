package vn.edu.hcmuaf.fit.marketplace.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import vn.edu.hcmuaf.fit.marketplace.entity.Address;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.AddressRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.OrderRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderControllerStoreStatsIntegrationTest {

    private static final String TEST_PASSWORD = "Test@123";
    private static final String VENDOR_EMAIL = "an.shop@fashion.local";
    private static final String CUSTOMER_EMAIL = "minh.customer@fashion.local";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void vendorStoreStatsPendingUsesWaitingForVendorStatus() {
        String vendorToken = loginAndExtractToken(VENDOR_EMAIL, TEST_PASSWORD);
        User vendor = getUser(VENDOR_EMAIL);
        User customer = getUser(CUSTOMER_EMAIL);
        Store store = storeRepository.findByOwnerId(vendor.getId()).orElseThrow();
        Address address = addressRepository.findByUserIdOrderByIsDefaultDesc(customer.getId())
                .stream()
                .findFirst()
                .orElseThrow();

        createStoreOrder(store.getId(), customer, address, Order.OrderStatus.WAITING_FOR_VENDOR);
        createStoreOrder(store.getId(), customer, address, Order.OrderStatus.PENDING);

        long expectedPendingOrders = orderRepository.countByStoreIdAndStatus(store.getId(), Order.OrderStatus.WAITING_FOR_VENDOR);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(vendorToken);
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/orders/my-store/stats",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        Number pendingOrders = (Number) body.get("pendingOrders");
        assertNotNull(pendingOrders);
        assertEquals(expectedPendingOrders, pendingOrders.longValue());
    }

    private void createStoreOrder(UUID storeId, User customer, Address address, Order.OrderStatus status) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        Order order = Order.builder()
                .orderCode("ORD-ST-" + suffix)
                .user(customer)
                .shippingAddress(address)
                .storeId(storeId)
                .status(status)
                .paymentMethod(Order.PaymentMethod.COD)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .subtotal(new BigDecimal("100000"))
                .shippingFee(BigDecimal.ZERO)
                .discount(BigDecimal.ZERO)
                .commissionFee(BigDecimal.ZERO)
                .vendorPayout(BigDecimal.ZERO)
                .build();
        order.calculateTotal();
        orderRepository.save(order);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Missing test user: " + email));
    }

    @SuppressWarnings("unchecked")
    private String loginAndExtractToken(String email, String password) {
        ResponseEntity<Map> loginResponse = restTemplate.postForEntity(
                "/api/auth/login",
                Map.of("email", email, "password", password),
                Map.class
        );
        assertEquals(HttpStatus.OK, loginResponse.getStatusCode());
        Map<String, Object> body = loginResponse.getBody();
        assertNotNull(body);
        Object token = body.get("token");
        assertNotNull(token);
        return String.valueOf(token);
    }
}
