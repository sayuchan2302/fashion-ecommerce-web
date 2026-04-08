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

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderControllerTopProductsRbacIntegrationTest {

    private static final String TEST_PASSWORD = "Test@123";

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void vendorCanAccessTopProductsEndpoint() {
        String token = loginAndExtractToken("an.shop@fashion.local", TEST_PASSWORD);
        ResponseEntity<String> response = callTopProductsEndpoint(token);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void customerCannotAccessTopProductsEndpoint() {
        String token = loginAndExtractToken("minh.customer@fashion.local", TEST_PASSWORD);
        ResponseEntity<String> response = callTopProductsEndpoint(token);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    private ResponseEntity<String> callTopProductsEndpoint(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(
                "/api/orders/my-store/top-products?days=30&limit=3",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );
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
}
