package vn.edu.hcmuaf.fit.marketplace.chatbot.service;

import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class NoopChatbotAiFallbackService implements ChatbotAiFallbackService {
    @Override
    public Optional<String> tryGenerateReply(String userInput) {
        return Optional.empty();
    }
}

