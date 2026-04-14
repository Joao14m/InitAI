package com.initai.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.initai.backend.model.*;
import com.initai.backend.repository.ProblemRepository;
import com.initai.backend.repository.SessionRepository;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SessionService {

    private static final String TRANSITION_PHRASE = "technical portion";
    private static final int BEHAVIORAL_MAX_TOKENS = 2048;

    private final SessionRepository sessionRepository;
    private final InterviewPromptService promptService;
    private final ClaudeService claudeService;
    private final ProblemRepository problemRepository;
    private final ObjectMapper objectMapper;

    public SessionService(InterviewPromptService promptService,
                          ClaudeService claudeService,
                          ProblemRepository problemRepository,
                          SessionRepository sessionRepository,
                          ObjectMapper objectMapper) {
        this.promptService = promptService;
        this.claudeService = claudeService;
        this.problemRepository = problemRepository;
        this.sessionRepository = sessionRepository;
        this.objectMapper = objectMapper;
    }

    public InterviewPlan generatePlan(String userGoal, String resumeText) {
        String prompt = promptService.buildPlanGenerationPrompt(userGoal, resumeText);
        String raw = claudeService.call(prompt, List.of(
            new Message("user", "Generate the interview plan now.")
        ), 1024);
        return parsePlan(raw);
    }

    public Session createSession(String level, String planSummary, String resumeText) {
        Session session = Session.builder()
            .id(UUID.randomUUID().toString())
            .level(level)
            .planSummary(planSummary)
            .resumeText(resumeText)
            .build();
        return sessionRepository.save(session);
    }

    public Session getSession(String sessionId) {
        return sessionRepository.findById(sessionId)
        .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
    }

    public BehavioralResponse handleBehavioralMessage(String sessionId, String userMessage) {
        Session session = getSession(sessionId);
        if (session.getPhase() != SessionPhase.BEHAVIORAL) {
            throw new IllegalStateException("Session is not in behavioral phase");
        }

        session.getConversationHistory().add(new Message("user", userMessage));

        String systemPrompt = promptService.buildBehavioralPrompt(session.getLevel(), session.getResumeText());
        String reply = claudeService.call(systemPrompt, session.getConversationHistory(), BEHAVIORAL_MAX_TOKENS);
        session.getConversationHistory().add(new Message("assistant", reply));

        boolean transitioning = reply.toLowerCase().contains(TRANSITION_PHRASE);
        if (transitioning) session.setPhase(SessionPhase.CODING);
        
        if (transitioning && session.getProblemId() == null) {
            String difficulty = difficultyForLevel(session.getLevel());
            problemRepository.findRandomByDifficulty(difficulty)
                .ifPresent(p -> session.setProblemId(p.getId()));
        }
        sessionRepository.save(session);


        return BehavioralResponse.builder()
            .reply(reply)
            .phase(session.getPhase().name())
            .build();
    }

    public HintResponse handleHint(String sessionId, String code, String question) {
        Session session = getSession(sessionId);
        if (session.getPhase() != SessionPhase.CODING) {
            throw new IllegalStateException("Session is not in coding phase");
        }

        Problem problem = problemRepository.findById(session.getProblemId())
            .orElseThrow(() -> new RuntimeException("Problem not found"));

        String systemPrompt = promptService.buildHintPrompt(
            problem, code, question, session.getHintCount()
        );
        String reply = claudeService.call(systemPrompt, List.of(
            new Message("user", "Respond now.")
        ), 256);

        session.setHintCount(session.getHintCount() + 1);
        sessionRepository.save(session);

        return HintResponse.builder().reply(reply).build();
    }

    public SubmitResponse handleSubmission(String sessionId, String code, String language) {
        Session session = getSession(sessionId);
        session.setFinalCode(code);
        session.setPhase(SessionPhase.COMPLETE);

        String systemPrompt = promptService.buildDebriefPrompt(
            session.getLevel(),
            session.getPlanSummary(),
            session.getResumeText(),
            code,
            session.getConversationHistory()
        );

        String rawJson = claudeService.call(systemPrompt, List.of(
            new Message("user", "Generate the debrief report now.")
        ), 2048);

        DebriefReport report = parseDebrief(rawJson);
        session.setDebriefReport(report);
        sessionRepository.save(session);

        return SubmitResponse.builder()
            .status("complete")
            .debriefReport(report)
            .build();
    }

    public DebriefReport getDebrief(String sessionId) {
        Session session = getSession(sessionId);
        if (session.getDebriefReport() == null) {
            throw new IllegalStateException("Debrief not yet available");
        }
        return session.getDebriefReport();
    }

    private InterviewPlan parsePlan(String raw) {
        try {
            String json = raw.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("^```[a-z]*\\n?", "").replaceAll("```$", "").trim();
            }
            return objectMapper.readValue(json, InterviewPlan.class);
        } catch (Exception e) {
            InterviewPlan fallback = new InterviewPlan();
            fallback.setLevel("JUNIOR");
            fallback.setLevelReason("Could not parse AI response.");
            fallback.setSummary(raw);
            fallback.setPhases(List.of());
            return fallback;
        }
    }

    private DebriefReport parseDebrief(String raw) {
        try {
            String json = raw.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("^```[a-z]*\\n?", "").replaceAll("```$", "").trim();
            }
            return objectMapper.readValue(json, DebriefReport.class);
        } catch (Exception e) {
            DebriefReport fallback = new DebriefReport();
            fallback.setScores(Map.of(
                "problem_solving", 0, "code_quality", 0,
                "communication", 0, "complexity_awareness", 0
            ));
            fallback.setFeedback(Map.of(
                "problem_solving", "Could not parse AI response.",
                "code_quality", raw, "communication", "", "complexity_awareness", ""
            ));
            fallback.setPriorityImprovement("Debrief parsing failed. Raw AI response stored in code_quality field.");
            return fallback;
        }
    }

    private String difficultyForLevel(String level) {
        return switch (level.toUpperCase()) {
            case "INTERN", "JUNIOR" -> "easy";
            case "MID" -> "medium";
            case "SENIOR" -> "hard";
            default -> "easy";
        };
    }
}
