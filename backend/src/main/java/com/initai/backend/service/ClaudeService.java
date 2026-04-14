package com.initai.backend.service;

import com.initai.backend.model.Message;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * Calls the Anthropic Messages API.
 * Reads ANTHROPIC_API_KEY from environment via application.properties.
 */
@Service
public class ClaudeService {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL = "claude-sonnet-4-6";
    private static final String API_VERSION = "2023-06-01";

    private final RestClient restClient;

    public ClaudeService(@Value("${anthropic.api-key}") String apiKey) {
        this.restClient = RestClient.builder()
            .baseUrl(API_URL)
            .defaultHeader("x-api-key", apiKey)
            .defaultHeader("anthropic-version", API_VERSION)
            .defaultHeader("Content-Type", "application/json")
            .build();
    }

    public String call(String systemPrompt, List<Message> messages, int maxTokens) {
        List<ApiMessage> apiMessages = messages.stream()
            .map(m -> new ApiMessage(m.getRole(), m.getContent()))
            .toList();

        ApiRequest request = new ApiRequest(MODEL, maxTokens, systemPrompt, apiMessages);

        ApiResponse response = restClient.post()
            .body(request)
            .retrieve()
            .body(ApiResponse.class);

        if (response == null || response.content() == null || response.content().isEmpty()) {
            throw new RuntimeException("Empty response from Claude API");
        }

        return response.content().get(0).text();
    }

    // --- Internal API request/response records ---

    record ApiRequest(
        String model,
        @JsonProperty("max_tokens") int maxTokens,
        String system,
        List<ApiMessage> messages
    ) {}

    record ApiMessage(String role, String content) {}

    record ApiResponse(List<ContentBlock> content) {}

    record ContentBlock(String type, String text) {}
}
