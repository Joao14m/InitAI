package com.initai.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.Map;

@Data
public class DebriefReport {
    private Map<String, Integer> scores;
    private Map<String, String> feedback;

    @JsonProperty("priority_improvement")
    private String priorityImprovement;
}
