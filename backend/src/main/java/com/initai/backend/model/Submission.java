package com.initai.backend.model;

import lombok.Data;

@Data
public class Submission {
    private String problemId;
    private String code;
    private String language;
}
