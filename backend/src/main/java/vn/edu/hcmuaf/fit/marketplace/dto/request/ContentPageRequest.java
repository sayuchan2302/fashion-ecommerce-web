package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import vn.edu.hcmuaf.fit.marketplace.entity.ContentPage;

@Getter
@Setter
public class ContentPageRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String body;

    @NotNull
    private ContentPage.ContentType type;

    private Integer displayOrder;
}
