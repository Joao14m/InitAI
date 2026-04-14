package com.initai.backend.controller;

import com.initai.backend.model.Submission;
import com.initai.backend.model.SubmissionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    @PostMapping
    public ResponseEntity<SubmissionResponse> submit(@RequestBody Submission submission) {
        // Step 3 will call the AI API here and return structured feedback.
        // For now, acknowledge receipt and echo back the submission.
        SubmissionResponse response = SubmissionResponse.builder()
            .status("received")
            .message("Submission received. AI evaluation coming in step 3.")
            .problemId(submission.getProblemId())
            .code(submission.getCode())
            .build();

        return ResponseEntity.ok(response);
    }
}
