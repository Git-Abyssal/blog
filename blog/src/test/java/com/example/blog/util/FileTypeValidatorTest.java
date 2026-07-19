package com.example.blog.util;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileTypeValidatorTest {

    @Test
    void returnsMimeTypeForValidPng() {
        byte[] png = new byte[] {
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D
        };
        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png", png);

        FileTypeValidator.FileTypeValidationResult result = FileTypeValidator.validateImageFile(file);

        assertTrue(result.valid);
        assertEquals("image/png", result.detectedFileType);
    }

    @Test
    void rejectsRiffFileWithoutWebpMarker() {
        byte[] riffButNotWebp = new byte[] {
                0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
                0x57, 0x41, 0x56, 0x45
        };
        MockMultipartFile file = new MockMultipartFile("file", "image.webp", "image/webp", riffButNotWebp);

        FileTypeValidator.FileTypeValidationResult result = FileTypeValidator.validateImageFile(file);

        assertFalse(result.valid);
    }
}
