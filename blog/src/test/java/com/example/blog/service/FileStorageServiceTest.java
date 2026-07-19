package com.example.blog.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileStorageServiceTest {

    @TempDir
    Path storageRoot;

    @Test
    void uploadsValidatedImageAndReturnsPublicUrl() throws Exception {
        FileStorageService fileStorageService =
                new FileStorageService(storageRoot.toString(), "blog-images", "/storage/");

        byte[] png = new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        };
        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", png
        );

        String url = fileStorageService.uploadFile(file);

        assertTrue(url.matches("/storage/blog-images/[0-9a-f-]+_image\\.png"));
        String fileName = url.substring(url.lastIndexOf('/') + 1);
        assertTrue(Files.exists(storageRoot.resolve("blog-images").resolve(fileName)));
    }

    @Test
    void rejectsEmptyFileWithoutCreatingStorageDirectory() {
        FileStorageService fileStorageService =
                new FileStorageService(storageRoot.toString(), "blog-images", "/storage");
        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", new byte[0]
        );

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> fileStorageService.uploadFile(file)
        );

        assertEquals("文件不能为空", error.getMessage());
        assertTrue(Files.notExists(storageRoot.resolve("blog-images")));
    }

    @Test
    void rejectsUnsafeBucketName() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new FileStorageService(storageRoot.toString(), "../outside", "/storage")
        );
    }
}
