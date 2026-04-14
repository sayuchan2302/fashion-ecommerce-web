package vn.edu.hcmuaf.fit.marketplace.chatbot.service;

import java.util.Optional;

public interface ChatbotAiFallbackService {
    Optional<String> tryGenerateReply(String userInput);
}

