package vn.edu.hcmuaf.fit.marketplace.chatbot;

import com.microsoft.bot.builder.ActivityHandler;
import com.microsoft.bot.builder.ConversationState;
import com.microsoft.bot.builder.MessageFactory;
import com.microsoft.bot.builder.StatePropertyAccessor;
import com.microsoft.bot.builder.TurnContext;
import com.microsoft.bot.schema.Activity;
import com.microsoft.bot.schema.ChannelAccount;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Component;
import vn.edu.hcmuaf.fit.marketplace.chatbot.service.ChatbotAiFallbackService;
import vn.edu.hcmuaf.fit.marketplace.chatbot.service.CustomerSupportChatService;
import vn.edu.hcmuaf.fit.marketplace.chatbot.service.CustomerSupportChatService.OrderLookupResult;
import vn.edu.hcmuaf.fit.marketplace.chatbot.service.CustomerSupportChatService.SizeAdviceResult;
import vn.edu.hcmuaf.fit.marketplace.config.ChatbotProperties;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Component
public class MarketplaceBot extends ActivityHandler {

    private static final String MENU_ORDER = "tra cuu don hang";
    private static final String MENU_SIZE = "tu van size";
    private static final String MENU_PRODUCT = "hoi dap san pham";

    private final ConversationState conversationState;
    private final StatePropertyAccessor<Object> sessionAccessor;
    private final CustomerSupportChatService supportChatService;
    private final ChatbotAiFallbackService aiFallbackService;
    private final ChatbotProperties chatbotProperties;

    public MarketplaceBot(
            ConversationState conversationState,
            CustomerSupportChatService supportChatService,
            ChatbotAiFallbackService aiFallbackService,
            ChatbotProperties chatbotProperties
    ) {
        this.conversationState = conversationState;
        this.supportChatService = supportChatService;
        this.aiFallbackService = aiFallbackService;
        this.chatbotProperties = chatbotProperties;
        this.sessionAccessor = conversationState.createProperty("customerSupportSession");
    }

    @Override
    public CompletableFuture<Void> onTurn(TurnContext turnContext) {
        return super.onTurn(turnContext)
                .thenCompose(ignore -> conversationState.saveChanges(turnContext, false));
    }

    @Override
    protected CompletableFuture<Void> onMembersAdded(List<ChannelAccount> membersAdded, TurnContext turnContext) {
        String botId = turnContext.getActivity().getRecipient() != null
                ? turnContext.getActivity().getRecipient().getId()
                : null;

        boolean hasRealUser = membersAdded.stream().anyMatch(member -> botId == null || !botId.equals(member.getId()));
        if (!hasRealUser) {
            return CompletableFuture.completedFuture(null);
        }
        return sendMainMenu(turnContext, "Xin chào! Mình là trợ lý CSKH của FashMarket. Bạn cần hỗ trợ gì?");
    }

    @Override
    protected CompletableFuture<Void> onMessageActivity(TurnContext turnContext) {
        String normalizedInput = normalize(turnContext.getActivity().getText());
        return sessionAccessor.get(turnContext, ChatSessionState::new)
                .thenCompose(rawState -> {
                    ChatSessionState state = toChatSessionState(rawState);
                    return sessionAccessor.set(turnContext, state)
                            .thenCompose(ignore -> routeMessage(turnContext, state, normalizedInput));
                });
    }

    private ChatSessionState toChatSessionState(Object rawState) {
        if (rawState == null) {
            return new ChatSessionState();
        }
        if (rawState instanceof ChatSessionState state) {
            return state;
        }
        if (rawState instanceof Map<?, ?> map) {
            return convertStateValues(
                    map.get("step"),
                    map.get("pendingOrderCode"),
                    map.get("heightCm")
            );
        }

        ChatSessionState remappedState = remapUnknownStateObject(rawState);
        if (remappedState != null) {
            return remappedState;
        }

        // Fallback for unknown state type.
        return new ChatSessionState();
    }

    private ChatSessionState remapUnknownStateObject(Object rawState) {
        boolean hasStateShape =
                hasProperty(rawState, "step")
                        || hasProperty(rawState, "pendingOrderCode")
                        || hasProperty(rawState, "heightCm");

        if (!hasStateShape) {
            return null;
        }

        return convertStateValues(
                readProperty(rawState, "step"),
                readProperty(rawState, "pendingOrderCode"),
                readProperty(rawState, "heightCm")
        );
    }

    private ChatSessionState convertStateValues(Object rawStep, Object rawPendingOrderCode, Object rawHeightCm) {
        ChatSessionState state = new ChatSessionState();

        if (rawStep != null) {
            try {
                state.step = ConversationStep.valueOf(rawStep.toString());
            } catch (IllegalArgumentException ignored) {
                state.step = ConversationStep.ROOT;
            }
        }

        if (rawPendingOrderCode != null) {
            state.pendingOrderCode = rawPendingOrderCode.toString();
        }

        state.heightCm = parseNullableInt(rawHeightCm);
        return state;
    }

    private Integer parseNullableInt(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean hasProperty(Object target, String propertyName) {
        Class<?> type = target.getClass();
        String getterName = getterName(propertyName);

        try {
            type.getMethod(getterName);
            return true;
        } catch (NoSuchMethodException ignored) {
            // ignore
        }

        try {
            type.getDeclaredField(propertyName);
            return true;
        } catch (NoSuchFieldException ignored) {
            return false;
        }
    }

    private Object readProperty(Object target, String propertyName) {
        Class<?> type = target.getClass();
        String getterName = getterName(propertyName);

        try {
            Method getter = type.getMethod(getterName);
            return getter.invoke(target);
        } catch (Exception ignored) {
            // Fall back to field access for foreign classloader objects.
        }

        try {
            Field field = type.getDeclaredField(propertyName);
            field.setAccessible(true);
            return field.get(target);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String getterName(String propertyName) {
        if (propertyName == null || propertyName.isBlank()) {
            return propertyName;
        }
        return "get" + Character.toUpperCase(propertyName.charAt(0)) + propertyName.substring(1);
    }

    private CompletableFuture<Void> routeMessage(TurnContext turnContext, ChatSessionState state, String input) {
        if (state.step == ConversationStep.AWAIT_ORDER_CODE) {
            state.pendingOrderCode = input == null ? "" : input.trim().toUpperCase(Locale.ROOT);
            state.step = ConversationStep.AWAIT_ORDER_PHONE4;
            return sendText(turnContext, "Vui lòng nhập 4 số cuối SĐT nhận hàng để xác minh.");
        }

        if (state.step == ConversationStep.AWAIT_ORDER_PHONE4) {
            String phone4 = onlyDigits(input);
            if (phone4.length() != 4) {
                return sendText(turnContext, "Định dạng chưa đúng. Vui lòng nhập đúng 4 chữ số.");
            }

            OrderLookupResult result = supportChatService.lookupOrderStatus(state.pendingOrderCode, phone4);
            state.reset();
            return sendText(turnContext, result.message())
                    .thenCompose(ignore -> sendMainMenu(turnContext, "Bạn cần hỗ trợ thêm gì nữa không?"));
        }

        if (state.step == ConversationStep.AWAIT_HEIGHT) {
            Integer height = parsePositiveInt(input);
            if (height == null || height < 120 || height > 230) {
                return sendText(turnContext, "Chiều cao chưa hợp lệ. Nhập lại giúp mình (cm), ví dụ: 168.");
            }
            state.heightCm = height;
            state.step = ConversationStep.AWAIT_WEIGHT;
            return sendText(turnContext, "Cảm ơn bạn. Giờ nhập cân nặng (kg), ví dụ: 58.");
        }

        if (state.step == ConversationStep.AWAIT_WEIGHT) {
            Integer weight = parsePositiveInt(input);
            if (weight == null || weight < 30 || weight > 200) {
                return sendText(turnContext, "Cân nặng chưa hợp lệ. Nhập lại giúp mình (kg), ví dụ: 58.");
            }

            SizeAdviceResult advice = supportChatService.recommendSize(state.heightCm, weight);
            state.reset();
            return sendText(turnContext, advice.message())
                    .thenCompose(ignore -> sendMainMenu(turnContext, "Bạn muốn tiếp tục với tác vụ nào?"));
        }

        if (MENU_ORDER.equals(input)) {
            state.step = ConversationStep.AWAIT_ORDER_CODE;
            return sendText(turnContext, "Bạn gửi giúp mình mã đơn hàng (ví dụ: DH-260412-000037).");
        }
        if (MENU_SIZE.equals(input)) {
            state.step = ConversationStep.AWAIT_HEIGHT;
            return sendText(turnContext, "Bạn cho mình chiều cao (cm) trước nhé.");
        }
        if (MENU_PRODUCT.equals(input)) {
            String answer = supportChatService.answerProductFaq(turnContext.getActivity().getText());
            return sendText(turnContext, answer)
                    .thenCompose(ignore -> sendMainMenu(turnContext, "Bạn muốn hỏi thêm gì?"));
        }

        if (chatbotProperties.isAiFallbackEnabled()) {
            Optional<String> aiResponse = aiFallbackService.tryGenerateReply(turnContext.getActivity().getText());
            if (aiResponse.isPresent() && !aiResponse.get().isBlank()) {
                return sendText(turnContext, aiResponse.get());
            }
        }

        return sendMainMenu(turnContext, "Mình chưa hiểu yêu cầu. Bạn chọn một chức năng bên dưới nhé.");
    }

    private CompletableFuture<Void> sendMainMenu(TurnContext turnContext, String prompt) {
        Activity reply = MessageFactory.suggestedActions(
                List.of("Tra cứu đơn hàng", "Tư vấn size", "Hỏi đáp sản phẩm"),
                prompt
        );
        return sendActivity(turnContext, reply);
    }

    private CompletableFuture<Void> sendText(TurnContext turnContext, String text) {
        return sendActivity(turnContext, MessageFactory.text(text));
    }

    private CompletableFuture<Void> sendActivity(TurnContext turnContext, Activity activity) {
        return turnContext.sendActivity(activity).thenApply(response -> null);
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String noAccent = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        String normalized = noAccent
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return normalized.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }

    private String onlyDigits(String value) {
        return value == null ? "" : value.replaceAll("\\D+", "");
    }

    private Integer parsePositiveInt(String value) {
        try {
            return Integer.parseInt(onlyDigits(value));
        } catch (Exception ex) {
            return null;
        }
    }

    enum ConversationStep {
        ROOT, AWAIT_ORDER_CODE, AWAIT_ORDER_PHONE4, AWAIT_HEIGHT, AWAIT_WEIGHT
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    static class ChatSessionState {
        private ConversationStep step = ConversationStep.ROOT;
        private String pendingOrderCode;
        private Integer heightCm;

        void reset() {
            this.step = ConversationStep.ROOT;
            this.pendingOrderCode = null;
            this.heightCm = null;
        }
    }
}
