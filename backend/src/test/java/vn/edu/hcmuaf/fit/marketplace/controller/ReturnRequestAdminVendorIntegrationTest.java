package vn.edu.hcmuaf.fit.marketplace.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.entity.OrderItem;
import vn.edu.hcmuaf.fit.marketplace.entity.ReturnRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.OrderRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ReturnRequestRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReturnRequestAdminVendorIntegrationTest {

    private static final String TEST_PASSWORD = "Test@123";
    private static final String ADMIN_EMAIL = "admin@fashion.local";
    private static final String VENDOR_AN_EMAIL = "an.shop@fashion.local";
    private static final String VENDOR_BINH_EMAIL = "binh.store@fashion.local";
    private static final String CUSTOMER_MINH_EMAIL = "minh.customer@fashion.local";
    private static final String CUSTOMER_LAN_EMAIL = "lan.customer@fashion.local";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ReturnRequestRepository returnRequestRepository;

    @LocalServerPort
    private int port;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    void vendorCannotAcceptReturnOutsideOwnStore() throws Exception {
        ReturnRequest target = createReturnFixture(
                VENDOR_BINH_EMAIL,
                CUSTOMER_LAN_EMAIL,
                ReturnRequest.ReturnStatus.PENDING_VENDOR,
                "OUTSIDE"
        );
        String vendorToken = loginAndExtractToken(VENDOR_AN_EMAIL, TEST_PASSWORD);

        ResponseEntity<String> response = exchangePatch(
                "/api/returns/my-store/" + target.getId() + "/accept",
                vendorToken,
                null
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void customerCannotApplyAdminFinalVerdict() throws Exception {
        ReturnRequest disputed = createReturnFixture(
                VENDOR_AN_EMAIL,
                CUSTOMER_MINH_EMAIL,
                ReturnRequest.ReturnStatus.DISPUTED,
                "NOADM"
        );
        String customerToken = loginAndExtractToken(CUSTOMER_MINH_EMAIL, TEST_PASSWORD);

        ResponseEntity<String> response = exchangePatch(
                "/api/returns/admin/" + disputed.getId() + "/verdict",
                customerToken,
                Map.of(
                        "action", "RELEASE_TO_VENDOR",
                        "adminNote", "Customer should not access this endpoint"
                )
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void adminFinalVerdictReleaseLocksFurtherCustomerDispute() throws Exception {
        ReturnRequest disputed = createReturnFixture(
                VENDOR_AN_EMAIL,
                CUSTOMER_MINH_EMAIL,
                ReturnRequest.ReturnStatus.DISPUTED,
                "LOCK"
        );
        String adminToken = loginAndExtractToken(ADMIN_EMAIL, TEST_PASSWORD);
        String customerToken = loginAndExtractToken(CUSTOMER_MINH_EMAIL, TEST_PASSWORD);

        ResponseEntity<String> verdictResponse = exchangePatch(
                "/api/returns/admin/" + disputed.getId() + "/verdict",
                adminToken,
                Map.of(
                        "action", "RELEASE_TO_VENDOR",
                        "adminNote", "Final rejection by admin"
                )
        );
        assertEquals(HttpStatus.OK, verdictResponse.getStatusCode());
        JsonNode verdictBody = objectMapper.readTree(verdictResponse.getBody());
        assertEquals("REJECTED", verdictBody.path("status").asText());

        ResponseEntity<String> disputeAgainResponse = exchangePatch(
                "/api/returns/" + disputed.getId() + "/dispute",
                customerToken,
                Map.of("reason", "Trying to reopen after final verdict")
        );
        assertEquals(HttpStatus.BAD_REQUEST, disputeAgainResponse.getStatusCode());
    }

    @Test
    void vendorListSupportsStatusesAndKeywordFilters() throws Exception {
        ReturnRequest disputed = createReturnFixture(
                VENDOR_AN_EMAIL,
                CUSTOMER_MINH_EMAIL,
                ReturnRequest.ReturnStatus.DISPUTED,
                "FILTER"
        );
        String vendorToken = loginAndExtractToken(VENDOR_AN_EMAIL, TEST_PASSWORD);
        String encodedKeyword = URLEncoder.encode(disputed.getReturnCode(), StandardCharsets.UTF_8);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/returns/my-store?statuses=DISPUTED&q=" + encodedKeyword + "&page=0&size=20",
                HttpMethod.GET,
                authorizedEntity(vendorToken),
                String.class
        );
        assertEquals(HttpStatus.OK, response.getStatusCode());

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode content = root.path("content");
        assertTrue(content.isArray());
        assertTrue(content.size() > 0, "Expected at least one filtered return");

        boolean foundFixture = false;
        for (JsonNode row : content) {
            assertEquals("DISPUTED", row.path("status").asText());
            if (disputed.getId().toString().equals(row.path("id").asText())) {
                foundFixture = true;
            }
        }
        assertTrue(foundFixture, "Expected filtered list to include created disputed fixture");
    }

    private ReturnRequest createReturnFixture(
            String vendorEmail,
            String customerEmail,
            ReturnRequest.ReturnStatus status,
            String tag
    ) {
        User vendor = userRepository.findByEmail(vendorEmail)
                .orElseThrow(() -> new IllegalStateException("Missing vendor fixture user: " + vendorEmail));
        Store store = storeRepository.findByOwnerId(vendor.getId())
                .orElseThrow(() -> new IllegalStateException("Missing fixture store for vendor: " + vendorEmail));
        User customer = userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new IllegalStateException("Missing customer fixture user: " + customerEmail));

        Optional<Order> candidate = orderRepository.findByUserIdOrderByCreatedAtDesc(customer.getId()).stream()
                .filter(order -> store.getId().equals(order.getStoreId()))
                .findFirst();
        Order order = candidate.orElseThrow(() -> new IllegalStateException(
                "Missing fixture order for store " + store.getId() + " and customer " + customer.getId()
        ));
        Order orderWithItems = orderRepository.findByIdWithItems(order.getId())
                .orElseThrow(() -> new IllegalStateException("Missing fixture order with items: " + order.getId()));
        OrderItem item = orderWithItems.getItems().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Fixture order has no items: " + order.getId()));

        ReturnRequest request = ReturnRequest.builder()
                .returnCode(buildReturnCode(tag))
                .order(orderWithItems)
                .user(customer)
                .storeId(store.getId())
                .reason(ReturnRequest.ReturnReason.OTHER)
                .resolution(ReturnRequest.ReturnResolution.REFUND)
                .status(status)
                .note("Integration test fixture")
                .vendorReason(status == ReturnRequest.ReturnStatus.REJECTED || status == ReturnRequest.ReturnStatus.DISPUTED
                        ? "Vendor rejected fixture"
                        : null)
                .disputeReason(status == ReturnRequest.ReturnStatus.DISPUTED
                        ? "Customer opened dispute fixture"
                        : null)
                .adminFinalized(false)
                .updatedBy("integration-test")
                .items(List.of(new ReturnRequest.ReturnItemSnapshot(
                        item.getId(),
                        item.getProductName(),
                        item.getVariantName(),
                        item.getProductImage(),
                        null,
                        1,
                        item.getUnitPrice()
                )))
                .build();

        return returnRequestRepository.save(request);
    }

    private String buildReturnCode(String tag) {
        String normalizedTag = tag == null ? "TEST" : tag.trim().toUpperCase();
        if (normalizedTag.isBlank()) {
            normalizedTag = "TEST";
        }
        if (normalizedTag.length() > 10) {
            normalizedTag = normalizedTag.substring(0, 10);
        }
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "RT-IT-" + normalizedTag + "-" + suffix;
    }

    @SuppressWarnings("unchecked")
    private String loginAndExtractToken(String email, String password) {
        Map<String, String> payload = Map.of("email", email, "password", password);
        ResponseEntity<Map> loginResponse = restTemplate.postForEntity("/api/auth/login", payload, Map.class);
        assertEquals(HttpStatus.OK, loginResponse.getStatusCode());
        Map<String, Object> body = loginResponse.getBody();
        assertNotNull(body);
        Object token = body.get("token");
        assertNotNull(token);
        String normalizedToken = String.valueOf(token);
        assertFalse(normalizedToken.isBlank(), "Expected login token to be non-empty");
        return normalizedToken;
    }

    private HttpEntity<Void> authorizedEntity(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    private ResponseEntity<String> exchangePatch(String path, String token, Map<String, String> body) throws Exception {
        String payload = body == null ? "" : objectMapper.writeValueAsString(body);
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(payload));
        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        return ResponseEntity.status(response.statusCode()).body(response.body());
    }

}
