package vn.edu.hcmuaf.fit.marketplace.controller;

import com.microsoft.bot.builder.Bot;
import com.microsoft.bot.builder.InvokeResponse;
import com.microsoft.bot.integration.BotFrameworkHttpAdapter;
import com.microsoft.bot.schema.Activity;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Properties;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class BotControllerTest {

    @Test
    void incoming_returnsOkWhenInvokeResponseIsNull() {
        StubBotFrameworkHttpAdapter adapter = new StubBotFrameworkHttpAdapter();
        adapter.response = null;
        Bot bot = turnContext -> CompletableFuture.completedFuture(null);
        BotController controller = new BotController(adapter, bot);

        Activity activity = Activity.createMessageActivity();
        activity.setText("hello");

        ResponseEntity<Object> response = controller.incoming(activity, null).join();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNull(response.getBody());
        assertEquals("hello", adapter.capturedActivity.getText());
        assertNull(adapter.capturedAuthHeader);
    }

    @Test
    void incoming_returnsAdapterStatusWhenInvokeResponsePresent() {
        StubBotFrameworkHttpAdapter adapter = new StubBotFrameworkHttpAdapter();
        adapter.response = new InvokeResponse(202, "accepted");
        Bot bot = turnContext -> CompletableFuture.completedFuture(null);
        BotController controller = new BotController(adapter, bot);

        Activity activity = Activity.createMessageActivity();
        activity.setText("hello");

        ResponseEntity<Object> response = controller.incoming(activity, "Bearer token").join();

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        assertEquals("accepted", response.getBody());
        assertEquals("Bearer token", adapter.capturedAuthHeader);
    }

    private static final class StubBotFrameworkHttpAdapter extends BotFrameworkHttpAdapter {
        private InvokeResponse response;
        private String capturedAuthHeader;
        private Activity capturedActivity;

        private StubBotFrameworkHttpAdapter() {
            super(new InMemoryBotConfiguration());
        }

        @Override
        public CompletableFuture<InvokeResponse> processIncomingActivity(String authHeader, Activity activity, Bot bot) {
            this.capturedAuthHeader = authHeader;
            this.capturedActivity = activity;
            return CompletableFuture.completedFuture(response);
        }
    }

    private static final class InMemoryBotConfiguration implements com.microsoft.bot.integration.Configuration {
        private final Properties properties = new Properties();

        private InMemoryBotConfiguration() {
            properties.setProperty("MicrosoftAppId", "test-app-id");
            properties.setProperty("MicrosoftAppPassword", "test-app-password");
        }

        @Override
        public String getProperty(String key) {
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

