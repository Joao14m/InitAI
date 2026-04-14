package com.initai.backend.controller;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    @PostMapping("/extract")
    public ResponseEntity<Map<String, String>> extract(@RequestParam("file") MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        String text;

        if ("application/pdf".equals(contentType) || (file.getOriginalFilename() != null
                && file.getOriginalFilename().toLowerCase().endsWith(".pdf"))) {
            try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
                text = new PDFTextStripper().getText(doc);
            }
        } else {
            // plain text
            text = new String(file.getBytes());
        }

        // Trim to 8000 chars to stay within prompt budget
        if (text.length() > 8000) {
            text = text.substring(0, 8000) + "\n[resume truncated]";
        }

        return ResponseEntity.ok(Map.of("text", text.trim()));
    }
}
