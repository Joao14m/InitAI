package com.initai.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Data
@Entity
@Table(name = "problems")
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String difficulty;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT[]")
    private String[] constraints;

    @Column(name = "starter_code", columnDefinition = "TEXT")
    private String starterCode;

    private String category;
}
