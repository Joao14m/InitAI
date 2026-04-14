package com.initai.backend.model;

import lombok.Data;

@Data
public class GeneratePlanRequest {
    private String userGoal;
    private String resumeText;
}
