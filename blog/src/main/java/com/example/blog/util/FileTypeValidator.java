package com.example.blog.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 基于 magic bytes 的文件类型校验，防止伪造 MIME 类型。
 */
public class FileTypeValidator {

    private static final Map<String, byte[]> ALLOWED_IMAGE_TYPES = new HashMap<>();
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );

    static {
        ALLOWED_IMAGE_TYPES.put("FFD8FF", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
        ALLOWED_IMAGE_TYPES.put("89504E470D0A1A0A", new byte[]{
            (byte) 0x89, (byte) 0x50, (byte) 0x4E, (byte) 0x47, (byte) 0x0D, (byte) 0x0A, (byte) 0x1A, (byte) 0x0A
        });
        ALLOWED_IMAGE_TYPES.put("47494638", new byte[]{(byte) 0x47, (byte) 0x49, (byte) 0x46, (byte) 0x38});
        ALLOWED_IMAGE_TYPES.put("52494646", new byte[]{(byte) 0x52, (byte) 0x49, (byte) 0x46, (byte) 0x46});
    }

    public static FileTypeValidationResult validateImageFile(MultipartFile file) {
        FileTypeValidationResult result = new FileTypeValidationResult();
        if (file == null || file.isEmpty()) {
            result.valid = false;
            result.errorMessage = "文件不能为空";
            return result;
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            result.valid = false;
            result.errorMessage = "不支持的文件类型: " + contentType + "。仅支持 JPG、PNG、GIF、WebP 格式";
            return result;
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            result.valid = false;
            result.errorMessage = "文件名不能为空";
            return result;
        }
        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!isImageExtension(extension)) {
            result.valid = false;
            result.errorMessage = "不支持的文件扩展名: ." + extension;
            return result;
        }
        if (containsPathTraversal(originalFilename)) {
            result.valid = false;
            result.errorMessage = "文件名包含非法字符";
            return result;
        }
        try {
            String actualFileType = detectFileTypeByMagicBytes(file);
            if (actualFileType == null) {
                result.valid = false;
                result.errorMessage = "无法识别的文件类型，文件可能已损坏";
                return result;
            }
            if (!isMimeTypeMatchesMagicBytes(contentType, actualFileType)) {
                result.valid = false;
                result.errorMessage = "文件内容与扩展名不匹配。可能的类型伪造攻击。";
                return result;
            }
            result.valid = true;
            result.detectedFileType = toMimeType(actualFileType);
            return result;
        } catch (IOException e) {
            result.valid = false;
            result.errorMessage = "文件读取失败: " + e.getMessage();
            return result;
        }
    }

    private static String detectFileTypeByMagicBytes(MultipartFile file) throws IOException {
        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int bytesRead = is.read(header);
            if (bytesRead < 3) {
                return null;
            }
            StringBuilder hexString = new StringBuilder();
            for (int i = 0; i < bytesRead; i++) {
                hexString.append(String.format("%02X", header[i]));
            }
            String headerHex = hexString.toString();
            for (Map.Entry<String, byte[]> entry : ALLOWED_IMAGE_TYPES.entrySet()) {
                if (headerHex.startsWith(entry.getKey())) {
                    if ("52494646".equals(entry.getKey()) && !isWebPHeader(header)) {
                        return null;
                    }
                    return entry.getKey();
                }
            }
            return null;
        }
    }

    private static boolean isWebPHeader(byte[] header) {
        return header.length >= 12
                && header[8] == 0x57
                && header[9] == 0x45
                && header[10] == 0x42
                && header[11] == 0x50;
    }

    private static boolean isMimeTypeMatchesMagicBytes(String mimeType, String magicBytesKey) {
        if (magicBytesKey == null) {
            return false;
        }
        switch (magicBytesKey) {
            case "FFD8FF": return mimeType.equals("image/jpeg") || mimeType.equals("image/jpg");
            case "89504E470D0A1A0A": return mimeType.equals("image/png");
            case "47494638": return mimeType.equals("image/gif");
            case "52494646": return mimeType.equals("image/webp");
            default: return false;
        }
    }

    private static String toMimeType(String magicBytesKey) {
        switch (magicBytesKey) {
            case "FFD8FF": return "image/jpeg";
            case "89504E470D0A1A0A": return "image/png";
            case "47494638": return "image/gif";
            case "52494646": return "image/webp";
            default: return "application/octet-stream";
        }
    }

    private static String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0 && lastDotIndex < filename.length() - 1) {
            return filename.substring(lastDotIndex + 1);
        }
        return "";
    }

    private static boolean isImageExtension(String extension) {
        return Arrays.asList("jpg", "jpeg", "png", "gif", "webp").contains(extension);
    }

    private static boolean containsPathTraversal(String filename) {
        return filename.contains("..") || filename.contains("/") || filename.contains("\\") || filename.contains("\0");
    }

    public static class FileTypeValidationResult {
        public boolean valid;
        public String errorMessage;
        public String detectedFileType;
    }
}
