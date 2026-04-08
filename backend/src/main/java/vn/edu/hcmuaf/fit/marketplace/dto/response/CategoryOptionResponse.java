package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryOptionResponse {
    private UUID id;
    private String name;
    private UUID parentId;
    private String label;
    private Boolean leaf;
    private Integer depth;
}
