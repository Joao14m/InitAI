package com.initai.backend.repository;

import com.initai.backend.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<Session, String>{
    
}
