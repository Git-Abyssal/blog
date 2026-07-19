package com.example.blog.controller;

import com.example.blog.audit.AuditLog;
import com.example.blog.entity.Category;
import com.example.blog.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 分类控制器
 */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {
    @Autowired
    private CategoryService categoryService;

    /**
     * 获取所有分类
     */
    @GetMapping
    public List<Category> getAllCategories() {
        return categoryService.getAllCategories();
    }

    /**
     * 创建分类（站长操作）- 需要审计
     */
    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    @AuditLog(action = "CREATE_CATEGORY", description = "创建分类", logParameters = true, logResult = true)
    public Category createCategory(@Valid @RequestBody Category category) {
        return categoryService.createCategory(category);
    }

    /**
     * 更新分类（站长操作）- 需要审计
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    @AuditLog(action = "UPDATE_CATEGORY", description = "更新分类", logParameters = true, logResult = true)
    public Category updateCategory(@PathVariable Long id, @Valid @RequestBody Category request) {
        return categoryService.updateCategory(id, request);
    }

    /**
     * 删除分类（站长操作）- 需要审计
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    @AuditLog(action = "DELETE_CATEGORY", description = "删除分类")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok().build();
    }
}
