package com.initai.backend.controller;

import com.initai.backend.model.Problem;
import com.initai.backend.repository.ProblemRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/problems")
public class ProblemController {

    private final ProblemRepository problemRepository;

    public ProblemController(ProblemRepository problemRepository) {
        this.problemRepository = problemRepository;
    }

    @GetMapping
    public List<Problem> getAllProblems() {
        return problemRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Problem> getProblem(@PathVariable Long id) {
        return problemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
