package com.initai.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "sessions")
public class Session {

    @Id
    private String id;

    private String level;

    @Column(name = "plan_summary", columnDefinition = "TEXT")
    private String planSummary;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SessionPhase phase = SessionPhase.BEHAVIORAL;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conversation_history", columnDefinition = "jsonb")
    @Builder.Default
    private List<Message> conversationHistory = new ArrayList<>();

    @Builder.Default
    @Column(name = "hint_count")
    private int hintCount = 0;

    @Column(name = "resume_text", columnDefinition = "TEXT")
    private String resumeText;

    @Column(name = "final_code", columnDefinition = "TEXT")
    private String finalCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "debrief_report", columnDefinition = "jsonb")
    private DebriefReport debriefReport;

    @Column(name = "problem_id")
    private Long problemId;
}
