package com.initai.backend.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HintResponse {
    private String reply;
}
