package vn.edu.hcmuaf.fit.marketplace.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PublicCodeLookupIntegrationTest {

    private static final String TEST_PASSWORD = "Test@123";
    private static final String ADMIN_EMAIL = "admin@fashion.local";
    private static final String VENDOR_EMAIL = "an.shop@fashion.local";
    private static final String CUSTOMER_EMAIL = "minh.customer@fashion.local";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void customerCanLookupOwnOrderByCode() throws Exception {
        String token = loginAndExtractToken(CUSTOMER_EMAIL, TEST_PASSWORD);

        ResponseEntity<String> orderListResponse = restTemplate.exchange(
                "/api/orders",
                HttpMethod.GET,
                authorizedEntity(token),
                String.class
        );
        assertEquals(HttpStatus.OK, orderListResponse.getStatusCode());

        JsonNode orders = objectMapper.readTree(orderListResponse.getBody());
        assertTrue(orders.isArray());
        assertTrue(orders.size() > 0, "Expected customer to have at least one order");

        String orderCode = orders.get(0).path("code").asText();
        assertFalse(orderCode.isBlank(), "Expected order code to be populated");

        ResponseEntity<String> detailResponse = restTemplate.exchange(
                "/api/orders/code/" + orderCode,
                HttpMethod.GET,
                authorizedEntity(token),
                String.class
        );
        assertEquals(HttpStatus.OK, detailResponse.getStatusCode());
        JsonNode detail = objectMapper.readTree(detailResponse.getBody());
        assertEquals(orderCode, detail.path("code").asText());
    }

    @Test
    void vendorCanLookupStoreOrderByCode() throws Exception {
        String token = loginAndExtractToken(VENDOR_EMAIL, TEST_PASSWORD);

        ResponseEntity<String> pageResponse = restTemplate.exchange(
                "/api/orders/my-store?page=0&size=1",
                HttpMethod.GET,
                authorizedEntity(token),
                String.class
        );
        assertEquals(HttpStatus.OK, pageResponse.getStatusCode());

        JsonNode pageBody = objectMapper.readTree(pageResponse.getBody());
        JsonNode content = pageBody.path("content");
        assertTrue(content.isArray());
        assertTrue(content.size() > 0, "Expected vendor to have at least one store order");

        String orderCode = content.get(0).path("code").asText();
        assertFalse(orderCode.isBlank(), "Expected vendor order code to be populated");

        ResponseEntity<String> detailResponse = restTemplate.exchange(
                "/api/orders/my-store/code/" + orderCode,
                HttpMethod.GET,
                authorizedEntity(token),
                String.class
        );
        assertEquals(HttpStatus.OK, detailResponse.getStatusCode());
        JsonNode detail = objectMapper.readTree(detailResponse.getBody());
        assertEquals(orderCode, detail.path("code").asText());
    }

    @Test
    void customerCannotAccessVendorStoreOrderByCode() {
        String token = loginAndExtractToken(CUSTOMER_EMAIL, TEST_PASSWORD);
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/orders/my-store/code/DH-999999-000001",
                HttpMethod.GET,
                authorizedEntity(token),
                String.class
        );
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void adminCanLookupReturnByCode() throws Exception {
        String adminToken = loginAndExtractToken(ADMIN_EMAIL, TEST_PASSWORD);

        ResponseEntity<String> listResponse = restTemplate.exchange(
                "/api/returns?page=0&size=1",
                HttpMethod.GET,
                authorizedEntity(adminToken),
                String.class
        );
        assertEquals(HttpStatus.OK, listResponse.getStatusCode());

        JsonNode listBody = objectMapper.readTree(listResponse.getBody());
        JsonNode content = listBody.path("content");
        assertTrue(content.isArray());
        assertTrue(content.size() > 0, "Expected at least one return request from seed data");

        String returnCode = content.get(0).path("code").asText();
        assertFalse(returnCode.isBlank(), "Expected return code to be populated");

        ResponseEntity<String> detailResponse = restTemplate.exchange(
                "/api/returns/code/" + returnCode,
                HttpMethod.GET,
                authorizedEntity(adminToken),
                String.class
        );
        assertEquals(HttpStatus.OK, detailResponse.getStatusCode());
        JsonNode detail = objectMapper.readTree(detailResponse.getBody());
        assertEquals(returnCode, detail.path("code").asText());
    }

    @Test
    void vendorCannotAccessReturnLookupByCode() {
        String token = loginAndExtractToken(VENDOR_EMAIL, TEST_PASSWORD);
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/returns/code/TH-999999-000001",
                HttpMethod.GET,
                authorizedEntity(token),
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
}
