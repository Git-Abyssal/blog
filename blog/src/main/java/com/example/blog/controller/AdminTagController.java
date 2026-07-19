package com.example.blog.controller;

import com.example.blog.audit.AuditLog;
import com.example.blog.dto.ReorderRequest;
import com.example.blog.entity.Tag;
import com.example.blog.service.TagService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/tags")
public class AdminTagController {

    @Autowired
    private TagService tagService;

    @GetMapping
    public Page<Tag> getTags(@PageableDefault(size = 10) Pageable pageable) {
        return tagService.getTagsForAdmin(pageable);
    }

    @PutMapping("/reorder")
    @AuditLog(action = "REORDER_TAGS", description = "调整标签顺序", logParameters = true)
    public void reorderTags(@Valid @RequestBody ReorderRequest request) {
        tagService.reorderTags(request.getOrderedIds());
    }
}
