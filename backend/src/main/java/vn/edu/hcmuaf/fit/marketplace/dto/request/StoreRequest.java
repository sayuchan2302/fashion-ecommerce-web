package vn.edu.hcmuaf.fit.marketplace.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreRequest {

    private String name;

    private String slug;

    private String description;

    private String logo;

    private String banner;

    private String contactEmail;

    private String phone;

    private String address;

    private String bankName;

    private String bankAccountNumber;

    private String bankAccountHolder;

    private Boolean bankVerified;

    private Boolean notifyNewOrder;

    private Boolean notifyOrderStatusChange;

    private Boolean notifyLowStock;

    private Boolean notifyPayoutComplete;

    private Boolean notifyPromotions;

    private Boolean shipGhn;

    private Boolean shipGhtk;

    private Boolean shipExpress;

    private String warehouseAddress;

    private String warehouseContact;

    private String warehousePhone;
}
