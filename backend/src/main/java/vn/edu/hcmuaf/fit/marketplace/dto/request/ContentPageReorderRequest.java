package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class ContentPageReorderRequest {
    @NotEmpty
    private List<Item> items;

    @Getter
    @Setter
    public static class Item {
        private UUID id;
        private Integer displayOrder;
    }
}
