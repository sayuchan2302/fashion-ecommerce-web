package vn.edu.hcmuaf.fit.marketplace.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryRequest {
    private String name;
    private String slug;
    private String description;
    private String image;
    private UUID parentId;
    private Integer sortOrder;
    private Boolean isVisible;
    private Boolean showOnMenu;

    @JsonIgnore
    @Builder.Default
    private boolean parentIdProvided = false;

    @JsonSetter("parentId")
    public void setParentId(UUID parentId) {
        this.parentId = parentId;
        this.parentIdProvided = true;
    }
}
