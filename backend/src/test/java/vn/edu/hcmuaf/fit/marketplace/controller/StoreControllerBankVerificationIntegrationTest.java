package vn.edu.hcmuaf.fit.marketplace.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.AdminAuditLogRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StoreControllerBankVerificationIntegrationTest {

    private static final String TEST_PASSWORD = "Test@123";
    private static final String ADMIN_EMAIL = "admin@fashion.local";
    private static final String VENDOR_EMAIL = "an.shop@fashion.local";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private AdminAuditLogRepository adminAuditLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @LocalServerPort
    private int port;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    void adminCanUpdateBankVerificationAndAuditIsWritten() throws Exception {
        String adminToken = loginAndExtractToken(ADMIN_EMAIL, TEST_PASSWORD);
        User vendor = getUser(VENDOR_EMAIL);
        Store store = storeRepository.findByOwnerId(vendor.getId()).orElseThrow();

        ResponseEntity<String> response = patchJson(
                "/api/stores/" + store.getId() + "/bank-verification",
                adminToken,
                Map.of("bankVerified", true, "note", "KYC approved"),
                true
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Store updated = storeRepository.findById(store.getId()).orElseThrow();
        assertTrue(Boolean.TRUE.equals(updated.getBankVerified()));

        boolean hasAudit = adminAuditLogRepository.findAll().stream().anyMatch(log ->
                "STORE".equals(log.getDomain())
                        && "UPDATE_BANK_VERIFICATION".equals(log.getAction())
                        && store.getId().equals(log.getTargetId())
                        && log.isSuccess()
        );
        assertTrue(hasAudit);
    }

    @Test
    void vendorCannotUpdateBankVerification() throws Exception {
        String vendorToken = loginAndExtractToken(VENDOR_EMAIL, TEST_PASSWORD);
        User vendor = getUser(VENDOR_EMAIL);
        Store store = storeRepository.findByOwnerId(vendor.getId()).orElseThrow();

        ResponseEntity<String> response = patchJson(
                "/api/stores/" + store.getId() + "/bank-verification",
                vendorToken,
                Map.of("bankVerified", true, "note", "should fail"),
                true
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    private ResponseEntity<String> patchJson(String path, String token, Object body, boolean auth) throws Exception {
        String payload = body == null ? "" : objectMapper.writeValueAsString(body);
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(payload));
        if (auth) {
            builder.header("Authorization", "Bearer " + token);
        }

        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        return ResponseEntity.status(response.statusCode()).body(response.body());
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
