package vn.edu.hcmuaf.fit.marketplace.dto.response;

import org.springframework.http.HttpStatus;

import java.time.Instant;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {
    public static ApiErrorResponse of(HttpStatus status, String message, String path) {
        String resolvedMessage = (message == null || message.isBlank())
                ? status.getReasonPhrase()
                : message;
        return new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                resolvedMessage,
                path
        );
    }
}
