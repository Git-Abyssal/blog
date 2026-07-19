package com.example.blog.service;

import com.example.blog.util.FileTypeValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Stores validated uploads in a dedicated local volume.
 */
@Service
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Pattern SAFE_BUCKET_NAME = Pattern.compile("[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]");

    private final Path storageRoot;
    private final String bucketName;
    private final String publicUrl;

    public FileStorageService(
            @Value("${storage.root}") String storageRoot,
            @Value("${storage.bucket-name}") String bucketName,
            @Value("${storage.public-url}") String publicUrl) {
        if (!SAFE_BUCKET_NAME.matcher(bucketName).matches()) {
            throw new IllegalArgumentException("Invalid storage bucket name");
        }
        this.storageRoot = Path.of(storageRoot).toAbsolutePath().normalize();
        this.bucketName = bucketName;
        this.publicUrl = publicUrl;
    }

    public String uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            logger.warn("Upload failed: File is empty");
            throw new IllegalArgumentException("文件不能为空");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            logger.warn("Upload failed: File size {} exceeds maximum limit", file.getSize());
            throw new IllegalArgumentException("文件大小超过5MB限制");
        }

        FileTypeValidator.FileTypeValidationResult validationResult = FileTypeValidator.validateImageFile(file);
        if (!validationResult.valid) {
            logger.warn("Upload failed: File validation error - {}", validationResult.errorMessage);
            throw new IllegalArgumentException(validationResult.errorMessage);
        }

        logger.info("File validation passed: type={}, size={}",
                validationResult.detectedFileType, file.getSize());

        Path temporaryFile = null;
        try {
            Path bucketPath = storageRoot.resolve(bucketName).normalize();
            if (!bucketPath.startsWith(storageRoot)) {
                throw new IllegalStateException("Invalid storage path");
            }
            Files.createDirectories(bucketPath);

            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image";
            String sanitizedName = sanitizeFilename(originalName);
            String fileName = UUID.randomUUID() + "_" + sanitizedName;
            Path targetFile = bucketPath.resolve(fileName).normalize();
            if (!targetFile.startsWith(bucketPath)) {
                throw new IllegalStateException("Invalid target path");
            }

            temporaryFile = Files.createTempFile(bucketPath, ".upload-", ".tmp");
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, temporaryFile, StandardCopyOption.REPLACE_EXISTING);
            }
            moveAtomically(temporaryFile, targetFile);
            temporaryFile = null;

            String fileUrl = getFileUrl(fileName);
            logger.info("File uploaded successfully: {}", fileName);
            return fileUrl;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("File upload failed for file: {}", file.getOriginalFilename(), e);
            throw new IllegalStateException("文件上传失败，请稍后再试");
        } finally {
            if (temporaryFile != null) {
                try {
                    Files.deleteIfExists(temporaryFile);
                } catch (Exception cleanupError) {
                    logger.warn("Failed to clean temporary upload file", cleanupError);
                }
            }
        }
    }

    private String getFileUrl(String key) {
        String baseUrl = publicUrl.endsWith("/")
                ? publicUrl.substring(0, publicUrl.length() - 1)
                : publicUrl;
        return baseUrl + "/" + bucketName + "/" + key;
    }

    private void moveAtomically(Path source, Path target) throws Exception {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(source, target);
        }
    }

    private String sanitizeFilename(String filename) {
        return filename.replaceAll("[^a-zA-Z0-9.-]", "_");
    }
}
