package com.example.blog.controller;

import com.example.blog.audit.AuditLog;
import com.example.blog.entity.Tag;
import com.example.blog.service.TagService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 标签控制器
 */
@RestController
@RequestMapping("/api/tags")
public class TagController {
    @Autowired
    private TagService tagService;

    /**
     * 获取所有标签
     */
    @GetMapping
    public List<Tag> getAllTags() {
        return tagService.getAllTags();
    }

    /**
     * 创建标签（站长操作）- 需要审计
     */
    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    @AuditLog(action = "CREATE_TAG", description = "创建标签", logParameters = true, logResult = true)
    public Tag createTag(@Valid @RequestBody Tag tag) {
        return tagService.createTag(tag);
    }

    /**
     * 更新标签（站长操作）- 需要审计
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    @AuditLog(action = "UPDATE_TAG", description = "更新标签", logParameters = true, logResult = true)
    public Tag updateTag(@PathVariable Long id, @Valid @RequestBody Tag request) {
        return tagService.updateTag(id, request);
    }

    /**
     * 删除标签（站长操作）- 需要审计
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    @AuditLog(action = "DELETE_TAG", description = "删除标签")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);
        return ResponseEntity.ok().build();
    }
}
