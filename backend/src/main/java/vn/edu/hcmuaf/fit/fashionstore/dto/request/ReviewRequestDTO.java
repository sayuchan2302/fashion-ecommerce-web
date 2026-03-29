package vn.edu.hcmuaf.fit.fashionstore.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ReviewRequestDTO {
    @NotNull(message = "productId is required")
    private UUID productId;

    private UUID orderId;

    @NotNull(message = "rating is required")
    @Min(value = 1, message = "rating must be between 1 and 5")
    @Max(value = 5, message = "rating must be between 1 and 5")
    private Integer rating;

    @Size(max = 150, message = "title must not exceed 150 characters")
    private String title;

    @NotBlank(message = "content is required")
    @Size(max = 2000, message = "content must not exceed 2000 characters")
    private String content;

    @Size(max = 5, message = "images must not exceed 5 entries")
    private List<@NotBlank(message = "image url cannot be blank") String> images;
}
