package vn.edu.hcmuaf.fit.marketplace.controller;

import com.microsoft.bot.builder.Bot;
import com.microsoft.bot.builder.InvokeResponse;
import com.microsoft.bot.integration.BotFrameworkHttpAdapter;
import com.microsoft.bot.schema.Activity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.CompletableFuture;

@RestController
public class BotController {

    private final BotFrameworkHttpAdapter adapter;
    private final Bot bot;

    public BotController(BotFrameworkHttpAdapter adapter, Bot bot) {
        this.adapter = adapter;
        this.bot = bot;
    }

    @PostMapping("/api/messages")
    public CompletableFuture<ResponseEntity<Object>> incoming(
            @RequestBody Activity activity,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return adapter.processIncomingActivity(authHeader, activity, bot)
                .thenApply(this::toResponseEntity);
    }

    private ResponseEntity<Object> toResponseEntity(InvokeResponse invokeResponse) {
        if (invokeResponse == null) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(invokeResponse.getStatus()).body(invokeResponse.getBody());
    }
}

