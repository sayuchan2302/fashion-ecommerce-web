package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class AdminCategoryResponse {
    private UUID id;
    private String name;
    private String slug;
    private UUID parentId;
    private Integer count;
    private String status;
    private Integer order;
    private Boolean showOnMenu;
    private String image;
    private String description;
}
