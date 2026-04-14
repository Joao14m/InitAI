package com.initai.backend.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubmissionResponse {
    private String status;
    private String message;
    private String problemId;
    private String code;
}
