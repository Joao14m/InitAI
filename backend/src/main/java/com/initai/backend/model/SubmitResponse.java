package com.initai.backend.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubmitResponse {
    private String status;
    private DebriefReport debriefReport;
}
