package vn.edu.hcmuaf.fit.marketplace.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.StringJoiner;
import java.util.UUID;

@Service
public class VisionSearchClient {

    private final VisionSearchProperties properties;
    private final ObjectMapper objectMapper;

    public VisionSearchClient(VisionSearchProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public VisionSearchResult searchImage(
            MultipartFile file,
            int limit,
            String categorySlug,
            String storeSlug
    ) {
        if (!properties.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image search service is disabled");
        }
        if (properties.getBaseUrl() == null || properties.getBaseUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image search service is not configured");
        }
        if (properties.getInternalSecret() == null || properties.getInternalSecret().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image search secret is not configured");
        }

        try {
            String boundary = "vision-search-" + UUID.randomUUID();
            byte[] body = buildMultipartBody(file, boundary);
            HttpURLConnection connection = (HttpURLConnection) new URL(
                    buildSearchUrl(limit, categorySlug, storeSlug)
            ).openConnection();
            connection.setConnectTimeout(Math.max(500, properties.getConnectTimeoutMs()));
            connection.setReadTimeout(Math.max(1000, properties.getReadTimeoutMs()));
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
            connection.setRequestProperty("X-Vision-Internal-Secret", properties.getInternalSecret());
            connection.setFixedLengthStreamingMode(body.length);

            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(body);
            }

            int statusCode = connection.getResponseCode();
            String responseBody = readResponseBody(connection, statusCode);
            if (statusCode >= 400) {
                throw translateError(statusCode, responseBody);
            }

            VisionSearchResponse payload = objectMapper.readValue(responseBody, VisionSearchResponse.class);
            return new VisionSearchResult(
                    payload == null || payload.candidates == null ? List.of() : payload.candidates,
                    payload == null || payload.totalCandidates == null ? 0 : payload.totalCandidates,
                    payload == null ? null : payload.indexVersion
            );
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to process image search response", ex);
        }
    }

    private String normalizeBaseUrl(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("/+$", "");
    }

    private String buildSearchUrl(int limit, String categorySlug, String storeSlug) {
        StringJoiner query = new StringJoiner("&");
        query.add("limit=" + limit);

        String normalizedCategorySlug = normalizeScopeSlug(categorySlug);
        if (normalizedCategorySlug != null) {
            query.add("category_slug=" + encodeValue(normalizedCategorySlug));
        }

        String normalizedStoreSlug = normalizeScopeSlug(storeSlug);
        if (normalizedStoreSlug != null) {
            query.add("store_slug=" + encodeValue(normalizedStoreSlug));
        }

        return normalizeBaseUrl(properties.getBaseUrl()) + "/v1/search/image?" + query;
    }

    private String normalizeScopeSlug(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private String encodeValue(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private byte[] buildMultipartBody(MultipartFile file, String boundary) throws IOException {
        String filename = file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()
                ? "query-image"
                : file.getOriginalFilename();
        String contentType = file.getContentType() == null || file.getContentType().isBlank()
                ? "application/octet-stream"
                : file.getContentType();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n").getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        output.write(file.getBytes());
        output.write("\r\n".getBytes(StandardCharsets.UTF_8));
        output.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return output.toByteArray();
    }

    private String readResponseBody(HttpURLConnection connection, int statusCode) throws IOException {
        InputStream stream = statusCode >= 400 ? connection.getErrorStream() : connection.getInputStream();
        if (stream == null) {
            return "";
        }
        try (InputStream inputStream = stream) {
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        } finally {
            connection.disconnect();
        }
    }

    private ResponseStatusException translateError(int statusCode, String body) {
        String message = body == null || body.isBlank() ? "Image search service returned an error" : body;
        HttpStatus status = switch (statusCode) {
            case 400 -> HttpStatus.BAD_REQUEST;
            case 401, 403 -> HttpStatus.BAD_GATEWAY;
            case 404 -> HttpStatus.BAD_GATEWAY;
            case 413 -> HttpStatus.PAYLOAD_TOO_LARGE;
            case 503 -> HttpStatus.SERVICE_UNAVAILABLE;
            case 504 -> HttpStatus.GATEWAY_TIMEOUT;
            default -> HttpStatus.BAD_GATEWAY;
        };
        return new ResponseStatusException(status, message);
    }

    public record VisionSearchResult(
            List<VisionCandidate> candidates,
            int totalCandidates,
            String indexVersion
    ) {
    }

    public record VisionCandidate(
            @JsonProperty("backend_product_id")
            UUID backendProductId,
            @JsonProperty("score")
            Double score,
            @JsonProperty("matched_image_url")
            String matchedImageUrl,
            @JsonProperty("matched_image_index")
            Integer matchedImageIndex,
            @JsonProperty("is_primary")
            Boolean isPrimary
    ) {
    }

    private static class VisionSearchResponse {
        @JsonProperty("candidates")
        private List<VisionCandidate> candidates;

        @JsonProperty("total_candidates")
        private Integer totalCandidates;

        @JsonProperty("index_version")
        private String indexVersion;
    }
}
