package vn.edu.hcmuaf.fit.fashionstore.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product;
import vn.edu.hcmuaf.fit.fashionstore.entity.User;
import vn.edu.hcmuaf.fit.fashionstore.repository.OrderRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ProductRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.UserRepository;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ReviewControllerCustomerFlowIntegrationTest {

    private static final String TEST_PASSWORD = "Test@123";
    private static final String CUSTOMER_EMAIL = "minh.customer@fashion.local";
    private static final String VENDOR_EMAIL = "an.shop@fashion.local";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    @org.junit.jupiter.api.Order(1)
    void customerCanReadEligibleReviewItems() throws Exception {
        String customerToken = loginAndExtractToken(CUSTOMER_EMAIL, TEST_PASSWORD);
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/reviews/my/eligible",
                HttpMethod.GET,
                authorizedEntity(customerToken),
                String.class
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = objectMapper.readTree(response.getBody());
        assertTrue(body.isArray());
        assertTrue(body.size() > 0, "Expected at least one eligible item from seed data");
    }

    @Test
    @org.junit.jupiter.api.Order(2)
    void vendorCannotReadEligibleReviewItems() {
        String vendorToken = loginAndExtractToken(VENDOR_EMAIL, TEST_PASSWORD);
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/reviews/my/eligible",
                HttpMethod.GET,
                authorizedEntity(vendorToken),
                String.class
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @org.junit.jupiter.api.Order(3)
    void customerCanSubmitReviewAndCannotDuplicateSameOrderItem() throws Exception {
        String customerToken = loginAndExtractToken(CUSTOMER_EMAIL, TEST_PASSWORD);

        ResponseEntity<String> eligibleResponse = restTemplate.exchange(
                "/api/reviews/my/eligible",
                HttpMethod.GET,
                authorizedEntity(customerToken),
                String.class
        );
        assertEquals(HttpStatus.OK, eligibleResponse.getStatusCode());
        JsonNode eligible = objectMapper.readTree(eligibleResponse.getBody());
        assertTrue(eligible.isArray());
        assertTrue(eligible.size() > 0, "Expected at least one eligible item before submit");

        JsonNode firstItem = eligible.get(0);
        String orderId = firstItem.get("orderId").asText();
        String productId = firstItem.get("productId").asText();

        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("productId", productId);
        payload.put("rating", 5);
        payload.put("title", "Integration test review");
        payload.put("content", "Flow works end to end.");
        payload.put("images", new String[0]);

        ResponseEntity<String> createResponse = restTemplate.exchange(
                "/api/reviews",
                HttpMethod.POST,
                authorizedJsonEntity(customerToken, payload),
                String.class
        );
        assertEquals(HttpStatus.OK, createResponse.getStatusCode());
        JsonNode createdBody = objectMapper.readTree(createResponse.getBody());
        assertEquals(orderId, createdBody.get("orderId").asText());
        assertEquals(productId, createdBody.get("productId").asText());
        assertEquals("PENDING", createdBody.get("status").asText());

        ResponseEntity<String> duplicateResponse = restTemplate.exchange(
                "/api/reviews",
                HttpMethod.POST,
                authorizedJsonEntity(customerToken, payload),
                String.class
        );
        assertEquals(HttpStatus.CONFLICT, duplicateResponse.getStatusCode());

        ResponseEntity<String> eligibleAfter = restTemplate.exchange(
                "/api/reviews/my/eligible",
                HttpMethod.GET,
                authorizedEntity(customerToken),
                String.class
        );
        assertEquals(HttpStatus.OK, eligibleAfter.getStatusCode());
        JsonNode eligibleAfterBody = objectMapper.readTree(eligibleAfter.getBody());
        boolean stillContainsSameItem = false;
        for (JsonNode item : eligibleAfterBody) {
            if (orderId.equals(item.get("orderId").asText()) && productId.equals(item.get("productId").asText())) {
                stillContainsSameItem = true;
                break;
            }
        }
        assertFalse(stillContainsSameItem, "Submitted item should no longer be eligible");
    }

    @Test
    @org.junit.jupiter.api.Order(4)
    void customerCannotSubmitReviewForUnpurchasedProduct() {
        String customerToken = loginAndExtractToken(CUSTOMER_EMAIL, TEST_PASSWORD);
        User customer = userRepository.findByEmail(CUSTOMER_EMAIL).orElseThrow();
        UUID customerId = customer.getId();

        Optional<Product> unpurchasedProduct = productRepository.findAll()
                .stream()
                .filter(product -> !orderRepository.existsDeliveredOrderItemByUserAndProduct(customerId, product.getId()))
                .findFirst();
        assertTrue(unpurchasedProduct.isPresent(), "Expected at least one unpurchased product in seed data");

        Map<String, Object> payload = new HashMap<>();
        payload.put("productId", unpurchasedProduct.get().getId());
        payload.put("rating", 4);
        payload.put("title", "Should be rejected");
        payload.put("content", "Trying to review unpurchased product");
        payload.put("images", new String[0]);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/reviews",
                HttpMethod.POST,
                authorizedJsonEntity(customerToken, payload),
                String.class
        );
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @SuppressWarnings("unchecked")
    private String loginAndExtractToken(String email, String password) {
        Map<String, String> payload = Map.of(
                "email", email,
                "password", password
        );
        ResponseEntity<Map> loginResponse = restTemplate.postForEntity("/api/auth/login", payload, Map.class);
        assertEquals(HttpStatus.OK, loginResponse.getStatusCode());
        Map<String, Object> body = loginResponse.getBody();
        assertNotNull(body);
        Object token = body.get("token");
        assertNotNull(token);
        return String.valueOf(token);
    }

    private HttpEntity<Void> authorizedEntity(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    private HttpEntity<Map<String, Object>> authorizedJsonEntity(String token, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }
}
