package com.initai.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PlanPhase {
    private String name;
    private int minutes;
    private String focus;
}
