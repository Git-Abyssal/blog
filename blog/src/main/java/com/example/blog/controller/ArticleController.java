package com.example.blog.controller;

import com.example.blog.entity.Article;
import com.example.blog.entity.Tag;
import com.example.blog.mapper.CategoryMapper;
import com.example.blog.mapper.TagMapper;
import com.example.blog.service.ArticleService;
import com.example.blog.util.CurrentOwnerHelper;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/articles")
public class ArticleController {
    private static final Logger logger = LoggerFactory.getLogger(ArticleController.class);

    @Autowired
    private ArticleService articleService;

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private TagMapper tagMapper;

    @GetMapping
    public Page<Article> getAllArticles(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tab,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long tagId,
            @PageableDefault(size = 10) Pageable pageable) {
        if (keyword != null && !keyword.isEmpty()) {
            return articleService.searchArticles(keyword, pageable);
        }
        if ("hot".equals(tab)) {
            return articleService.getHotArticles(pageable);
        }
        if (categoryId != null) {
            return articleService.getArticlesByCategory(categoryId, pageable);
        }
        if (tagId != null) {
            return articleService.getArticlesByTag(tagId, pageable);
        }
        return articleService.getAllArticles(pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Article> getArticleById(
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean trackView) {
        return articleService.getArticleById(id).map(article -> {
            // 草稿仅站长可查看
            if (!Article.STATUS_PUBLISHED.equals(article.getStatus())) {
                if (!CurrentOwnerHelper.isOwner()) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).<Article>build();
                }
            } else if (trackView) {
                try {
                    articleService.incrementViews(id);
                } catch (Exception e) {
                    logger.warn("Failed to increment views for article {}: {}", id, e.getMessage());
                }
            }
            return ResponseEntity.ok(article);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Article> createArticle(@Valid @RequestBody Article article) {
        if (article.getCategory() != null && article.getCategory().getId() != null) {
            article.setCategory(categoryMapper.selectById(article.getCategory().getId()));
        } else {
            article.setCategory(null);
        }
        if (article.getTags() != null && !article.getTags().isEmpty()) {
            var ids = article.getTags().stream().map(Tag::getId).filter(tid -> tid != null).collect(Collectors.toList());
            article.setTags(ids.isEmpty() ? Collections.emptySet() : new HashSet<>(tagMapper.selectByIds(ids)));
        } else {
            article.setTags(Collections.emptySet());
        }
        if (article.getCoverImage() == null || article.getCoverImage().isEmpty()) {
            article.setCoverImage(extractFirstImageUrl(article.getContent()));
        }
        article.setViews(0);
        article.setStatus(Article.STATUS_PUBLISHED);
        return ResponseEntity.ok(articleService.createArticle(article));
    }

    /**
     * 保存草稿
     */
    @PostMapping("/draft")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> saveDraft(@RequestBody Article article) {
        if (article.getId() != null) {
            return articleService.getArticleById(article.getId()).map(existing -> {
                existing.setTitle(article.getTitle());
                existing.setContent(article.getContent());
                existing.setSummary(article.getSummary());
                boolean remainsPublished = Article.STATUS_PUBLISHED.equals(existing.getStatus());
                existing.setStatus(remainsPublished ? Article.STATUS_PUBLISHED : Article.STATUS_DRAFT);
                if (article.getCategory() != null && article.getCategory().getId() != null) {
                    existing.setCategory(categoryMapper.selectById(article.getCategory().getId()));
                } else {
                    existing.setCategory(null);
                }
                if (article.getTags() != null && !article.getTags().isEmpty()) {
                    var ids = article.getTags().stream().map(Tag::getId).filter(tid -> tid != null).collect(Collectors.toList());
                    existing.setTags(ids.isEmpty() ? Collections.emptySet() : new HashSet<>(tagMapper.selectByIds(ids)));
                } else {
                    existing.setTags(Collections.emptySet());
                }
                existing.setCoverImage(extractFirstImageUrl(article.getContent()));
                return ResponseEntity.ok(articleService.updateArticle(existing));
            }).orElse(ResponseEntity.notFound().build());
        }

        if (article.getCategory() != null && article.getCategory().getId() != null) {
            article.setCategory(categoryMapper.selectById(article.getCategory().getId()));
        }
        if (article.getTags() != null && !article.getTags().isEmpty()) {
            var ids = article.getTags().stream().map(Tag::getId).filter(tid -> tid != null).collect(Collectors.toList());
            article.setTags(ids.isEmpty() ? Collections.emptySet() : new HashSet<>(tagMapper.selectByIds(ids)));
        } else {
            article.setTags(Collections.emptySet());
        }

        article.setViews(0);
        article.setStatus(Article.STATUS_DRAFT);
        return ResponseEntity.ok(articleService.createArticle(article));
    }

    private String extractFirstImageUrl(String content) {
        if (content == null) {
            return null;
        }
        // 匹配 Markdown 图片语法 ![alt](url) 或 HTML <img> 标签
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("!\\[.*?\\]\\((.*?)\\)");
        java.util.regex.Matcher matcher = pattern.matcher(content);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody Article articleDetails,
            @RequestParam(required = false) Boolean publish) {
        return articleService.getArticleById(id).<ResponseEntity<?>>map(article -> {
            article.setTitle(articleDetails.getTitle());
            article.setContent(articleDetails.getContent());
            article.setSummary(articleDetails.getSummary());
            if (Boolean.TRUE.equals(publish)) {
                article.setStatus(Article.STATUS_PUBLISHED);
            } else {
                // 存草稿：已发布的文章保持发布，否则保存为草稿
                if (!Article.STATUS_PUBLISHED.equals(article.getStatus())) {
                    article.setStatus(Article.STATUS_DRAFT);
                }
            }
            // 从仓库按 id 加载，避免请求体中的游离实体导致异常或错误关联
            if (articleDetails.getCategory() != null && articleDetails.getCategory().getId() != null) {
                article.setCategory(categoryMapper.selectById(articleDetails.getCategory().getId()));
            } else {
                article.setCategory(null);
            }
            if (articleDetails.getTags() != null && !articleDetails.getTags().isEmpty()) {
                var ids = articleDetails.getTags().stream().map(Tag::getId).filter(tid -> tid != null).collect(Collectors.toList());
                article.setTags(ids.isEmpty() ? Collections.emptySet() : new HashSet<>(tagMapper.selectByIds(ids)));
            } else {
                article.setTags(Collections.emptySet());
            }
            // 更新时也尝试提取封面图
            article.setCoverImage(extractFirstImageUrl(articleDetails.getContent()));

            return ResponseEntity.ok(articleService.updateArticle(article));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> deleteArticle(@PathVariable Long id) {
        return articleService.getArticleById(id).map(article -> {
            articleService.deleteArticle(id);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private boolean canInteractWithArticle(Article article) {
        return Article.STATUS_PUBLISHED.equals(article.getStatus()) || CurrentOwnerHelper.isOwner();
    }

    // ========== 相关文章接口 ==========

    @GetMapping("/{id}/related")
    public ResponseEntity<List<Article>> getRelatedArticles(@PathVariable Long id) {
        return articleService.getArticleById(id).map(article -> {
            if (!canInteractWithArticle(article)) {
                return ResponseEntity.notFound().<List<Article>>build();
            }
            Long categoryId = article.getCategory() != null ? article.getCategory().getId() : null;
            List<Article> related = articleService.getRelatedArticles(id, categoryId);
            return ResponseEntity.ok(related);
        }).orElse(ResponseEntity.notFound().build());
    }

}
