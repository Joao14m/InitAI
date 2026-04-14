package com.initai.backend.controller;

import com.initai.backend.model.*;
import com.initai.backend.repository.ProblemRepository;
import com.initai.backend.service.SessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService sessionService;
    private final ProblemRepository problemRepository;

    public SessionController(SessionService sessionService, ProblemRepository problemRepository) {
        this.sessionService = sessionService;
        this.problemRepository = problemRepository;
    }

    @PostMapping("/plan")
    public ResponseEntity<InterviewPlan> generatePlan(@RequestBody GeneratePlanRequest request) {
        return ResponseEntity.ok(sessionService.generatePlan(request.getUserGoal(), request.getResumeText()));
    }

    @PostMapping
    public ResponseEntity<CreateSessionResponse> createSession(@RequestBody CreateSessionRequest request) {
        Session session = sessionService.createSession(
            request.getLevel(), request.getPlanSummary(), request.getResumeText()
        );
        return ResponseEntity.ok(CreateSessionResponse.builder()
            .sessionId(session.getId())
            .build());
    }

    @PostMapping("/{id}/behavioral")
    public ResponseEntity<BehavioralResponse> behavioral(
            @PathVariable String id,
            @RequestBody BehavioralRequest request) {
        return ResponseEntity.ok(sessionService.handleBehavioralMessage(id, request.getMessage()));
    }

    @PostMapping("/{id}/hint")
    public ResponseEntity<HintResponse> hint(
            @PathVariable String id,
            @RequestBody HintRequest request) {
        return ResponseEntity.ok(sessionService.handleHint(id, request.getCode(), request.getQuestion()));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<SubmitResponse> submit(
            @PathVariable String id,
            @RequestBody SubmitRequest request) {
        return ResponseEntity.ok(sessionService.handleSubmission(id, request.getCode(), request.getLanguage()));
    }

    @GetMapping("/{id}/debrief")
    public ResponseEntity<DebriefReport> debrief(@PathVariable String id) {
        return ResponseEntity.ok(sessionService.getDebrief(id));
    }

    @GetMapping("/{id}/problem")
    public ResponseEntity<Problem> getProblem(@PathVariable String id) {
        Session session = sessionService.getSession(id);
        if (session.getProblemId() == null) {
            return ResponseEntity.noContent().build();
        }
        return problemRepository.findById(session.getProblemId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

}
