package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hcmuaf.fit.marketplace.entity.ContentPage;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ContentPageResponse {
    private UUID id;
    private String title;
    private String body;
    private ContentPage.ContentType type;
    private Integer displayOrder;
    private LocalDateTime updatedAt;
    private String updatedBy;
}
