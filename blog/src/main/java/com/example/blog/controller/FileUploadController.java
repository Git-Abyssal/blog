package com.example.blog.controller;

import com.example.blog.dto.ApiResponse;
import com.example.blog.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;

/**
 * 文件上传 API：图片上传，含类型校验与限流。
 */
@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    @Autowired
    private FileStorageService fileStorageService;

    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ApiResponse.error(400, "请选择要上传的图片").toResponseEntity();
        }
        try {
            String url = fileStorageService.uploadFile(file);
            return ResponseEntity.ok(ApiResponse.ok(Collections.singletonMap("url", url)));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(400, e.getMessage()).toResponseEntity();
        } catch (Exception e) {
            return ApiResponse.error(500, "文件上传失败，请稍后再试").toResponseEntity();
        }
    }
}
