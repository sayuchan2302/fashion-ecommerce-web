package vn.edu.hcmuaf.fit.marketplace.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "azure-bot")
public class AzureBotProperties {

    private String microsoftAppId = "";

    private String microsoftAppPassword = "";

    private String microsoftAppTenantId;
    private String microsoftAppType = "SingleTenant";
    private boolean authenticationEnabled = false;
}
