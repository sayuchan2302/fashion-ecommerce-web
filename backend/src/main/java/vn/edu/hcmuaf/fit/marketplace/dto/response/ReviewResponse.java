package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ReviewResponse {
    private UUID id;
    private UUID storeId;
    private UUID productId;
    private String productName;
    private String productImage;
    private String customerName;
    private String customerEmail;
    private Integer rating;
    private String content;
    private List<String> images;
    private LocalDateTime date;
    private String status;
    private String reply;
    private LocalDateTime replyAt;
    private String orderId;
    private String orderCode;
    private Integer version;
}
