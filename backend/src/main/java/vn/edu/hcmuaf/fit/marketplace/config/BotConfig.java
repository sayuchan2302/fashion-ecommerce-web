package vn.edu.hcmuaf.fit.marketplace.config;

import com.microsoft.bot.builder.ConversationState;
import com.microsoft.bot.builder.MemoryStorage;
import com.microsoft.bot.builder.Storage;
import com.microsoft.bot.connector.authentication.AuthenticationConfiguration;
import com.microsoft.bot.connector.authentication.ClaimsValidator;
import com.microsoft.bot.integration.BotFrameworkHttpAdapter;
import jakarta.annotation.Nonnull;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import java.util.Properties;
import java.util.concurrent.CompletableFuture;

@Configuration
@EnableConfigurationProperties(AzureBotProperties.class)
public class BotConfig {

    @Bean
    public com.microsoft.bot.integration.Configuration botSdkConfiguration(AzureBotProperties properties) {
        Properties data = new Properties();
        boolean authEnabled = properties.isAuthenticationEnabled();
        String appId = authEnabled && StringUtils.hasText(properties.getMicrosoftAppId())
                ? properties.getMicrosoftAppId().trim()
                : "";
        String appPassword = authEnabled && StringUtils.hasText(properties.getMicrosoftAppPassword())
                ? properties.getMicrosoftAppPassword().trim()
                : "";

        data.setProperty("MicrosoftAppId", appId);
        data.setProperty("MicrosoftAppPassword", appPassword);

        if (authEnabled && StringUtils.hasText(properties.getMicrosoftAppTenantId())) {
            data.setProperty("MicrosoftAppTenantId", properties.getMicrosoftAppTenantId());
        }
        if (authEnabled && StringUtils.hasText(properties.getMicrosoftAppType())) {
            data.setProperty("MicrosoftAppType", properties.getMicrosoftAppType());
        }
        return new MapBotConfiguration(data);
    }

    @Bean
    public AuthenticationConfiguration botAuthenticationConfiguration(AzureBotProperties properties) {
        AuthenticationConfiguration configuration = new AuthenticationConfiguration();

        boolean singleTenant = properties.isAuthenticationEnabled()
                && "SingleTenant".equalsIgnoreCase(properties.getMicrosoftAppType());
        if (singleTenant && StringUtils.hasText(properties.getMicrosoftAppTenantId())) {
            configuration.setClaimsValidator(new ClaimsValidator() {
                @Override
                public CompletableFuture<Void> validateClaims(java.util.Map<String, String> claims) {
                    String tokenTenant = claims.get("tid");
                    if (!StringUtils.hasText(tokenTenant)
                            || !properties.getMicrosoftAppTenantId().equalsIgnoreCase(tokenTenant)) {
                        return CompletableFuture.failedFuture(new SecurityException("Invalid tenant for bot token"));
                    }
                    return CompletableFuture.completedFuture(null);
                }
            });
        }

        return configuration;
    }

    @Bean
    public BotFrameworkHttpAdapter botFrameworkHttpAdapter(
            com.microsoft.bot.integration.Configuration botSdkConfiguration,
            AuthenticationConfiguration botAuthenticationConfiguration
    ) {
        return new BotFrameworkHttpAdapter(botSdkConfiguration, botAuthenticationConfiguration);
    }

    @Bean
    public Storage botStorage() {
        return new MemoryStorage();
    }

    @Bean
    public ConversationState conversationState(Storage botStorage) {
        return new ConversationState(botStorage);
    }

    private static final class MapBotConfiguration implements com.microsoft.bot.integration.Configuration {
        private final Properties properties;

        private MapBotConfiguration(Properties properties) {
            this.properties = properties;
        }

        @Override
        public String getProperty(@Nonnull String key) {
            return properties.getProperty(key);
        }

        @Override
        public Properties getProperties() {
            return properties;
        }

        @Override
        public String[] getProperties(String key) {
            String value = properties.getProperty(key);
            return value == null ? null : value.split(",");
        }
    }
}
