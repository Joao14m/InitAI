package com.initai.backend.repository;

import com.initai.backend.model.Problem;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProblemRepository extends JpaRepository<Problem, Long> {
    @Query(value = "SELECT * FROM problems WHERE difficulty = :difficulty ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Optional<Problem> findRandomByDifficulty(@Param("difficulty") String difficulty);
}
