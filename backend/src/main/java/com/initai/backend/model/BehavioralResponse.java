package com.initai.backend.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BehavioralResponse {
    private String reply;
    private String phase;  // "BEHAVIORAL" or "CODING"
}
