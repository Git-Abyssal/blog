package com.example.blog.controller;

import com.example.blog.entity.Article;
import com.example.blog.service.ArticleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 管理后台文章接口：文章列表（含草稿和已发布文章）
 */
@RestController
@RequestMapping("/api/admin/articles")
@PreAuthorize("hasRole('OWNER')")
public class AdminArticleController {

    @Autowired
    private ArticleService articleService;

    /**
     * 获取所有文章（含草稿和已发布文章），供管理后台使用
     */
    @GetMapping
    public Page<Article> getAllArticles(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long tagId,
            @PageableDefault(size = 10) Pageable pageable) {
        return articleService.getAllArticlesForAdmin(keyword, status, categoryId, tagId, pageable);
    }

}
