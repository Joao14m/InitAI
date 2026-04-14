package com.initai.backend.model;

import lombok.Data;

import java.util.List;

@Data
public class InterviewPlan {
    private String level;
    private String levelReason;
    private String summary;
    private List<PlanPhase> phases;
}
