package vn.edu.hcmuaf.fit.marketplace.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "vnpay")
public class VNPayProperties {

    private String tmnCode;
    private String hashSecret;
    private String payUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private String returnUrl;
    private String ipnUrl;
    private int expireMinutes = 15;
    private String locale = "vn";

    public boolean isConfigured() {
        return hasText(tmnCode) && hasText(hashSecret) && hasText(payUrl) && hasText(returnUrl);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
