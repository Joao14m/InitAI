package com.initai.backend.model;

import lombok.Data;

@Data
public class CreateSessionRequest {
    private String level;
    private String planSummary;
    private String resumeText;
}
