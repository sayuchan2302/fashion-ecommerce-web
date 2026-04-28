package vn.edu.hcmuaf.fit.marketplace.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import vn.edu.hcmuaf.fit.marketplace.dto.response.ApiErrorResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleMaxUploadSizeExceededReturnsPayloadTooLarge() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/public/marketplace/search/image");

        ResponseEntity<ApiErrorResponse> response = handler.handleMaxUploadSizeExceeded(
                new MaxUploadSizeExceededException(5_242_880L),
                request
        );

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, response.getStatusCode());
        assertEquals("Uploaded file is too large", response.getBody().message());
        assertEquals("/api/public/marketplace/search/image", response.getBody().path());
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE.value(), response.getBody().status());
    }
}
