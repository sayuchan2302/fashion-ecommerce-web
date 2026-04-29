package vn.edu.hcmuaf.fit.marketplace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class VisionSearchClientTest {

    @Test
    void sanitizeMultipartFilenameReplacesControlCharactersAndQuotes() {
        String sanitized = VisionSearchClient.sanitizeMultipartFilename("bad\r\n\"name\"\\path/test.jpg");

        assertEquals("bad___name__path_test.jpg", sanitized);
    }

    @Test
    void sanitizeMultipartFilenameFallsBackWhenBlank() {
        assertEquals("query-image", VisionSearchClient.sanitizeMultipartFilename("  "));
        assertEquals("query-image", VisionSearchClient.sanitizeMultipartFilename(null));
    }

    @Test
    void deserializeSearchResponseParsesOptionalInferredMetadata() throws Exception {
        VisionSearchClient client = new VisionSearchClient(new VisionSearchProperties(), new ObjectMapper());

        VisionSearchClient.VisionSearchResult result = client.deserializeSearchResponse("""
                {
                  "candidates": [],
                  "total_candidates": 3,
                  "index_version": "sync-2026-04-29",
                  "inferred_category": "tat",
                  "inferred_category_score": 0.31,
                  "category_filter_applied": "hard",
                  "extra_field": "ignored"
                }
                """);

        assertEquals(3, result.totalCandidates());
        assertEquals("sync-2026-04-29", result.indexVersion());
        assertEquals("tat", result.inferredCategory());
        assertEquals(0.31, result.inferredCategoryScore());
        assertEquals("hard", result.categoryFilterApplied());
    }

    @Test
    void deserializeSearchResponseKeepsWorkingWhenOptionalMetadataIsMissing() throws Exception {
        VisionSearchClient client = new VisionSearchClient(new VisionSearchProperties(), new ObjectMapper());

        VisionSearchClient.VisionSearchResult result = client.deserializeSearchResponse("""
                {
                  "candidates": [],
                  "total_candidates": 0,
                  "index_version": "sync-2026-04-29"
                }
                """);

        assertEquals(0, result.totalCandidates());
        assertEquals("sync-2026-04-29", result.indexVersion());
        assertNull(result.inferredCategory());
        assertNull(result.inferredCategoryScore());
        assertNull(result.categoryFilterApplied());
    }
}
