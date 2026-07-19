package com.example.blog.controller;

import com.example.blog.audit.AuditLog;
import com.example.blog.dto.ReorderRequest;
import com.example.blog.entity.Category;
import com.example.blog.service.CategoryService;
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
@RequestMapping("/api/admin/categories")
public class AdminCategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping
    public Page<Category> getCategories(@PageableDefault(size = 10) Pageable pageable) {
        return categoryService.getCategoriesForAdmin(pageable);
    }

    @PutMapping("/reorder")
    @AuditLog(action = "REORDER_CATEGORIES", description = "调整分类顺序", logParameters = true)
    public void reorderCategories(@Valid @RequestBody ReorderRequest request) {
        categoryService.reorderCategories(request.getOrderedIds());
    }
}
