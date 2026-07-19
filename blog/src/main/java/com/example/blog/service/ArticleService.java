package com.example.blog.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.blog.entity.Article;
import com.example.blog.entity.Category;
import com.example.blog.entity.Comment;
import com.example.blog.entity.Tag;
import com.example.blog.mapper.ArticleMapper;
import com.example.blog.mapper.ArticleTagMapper;
import com.example.blog.mapper.CategoryMapper;
import com.example.blog.mapper.CommentMapper;
import com.example.blog.mapper.TagMapper;
import com.example.blog.util.SqlEscaper;
import com.example.blog.util.XssSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ArticleService {

    private static final Logger logger = LoggerFactory.getLogger(ArticleService.class);

    @Autowired
    private ArticleMapper articleMapper;
    @Autowired
    private ArticleTagMapper articleTagMapper;
    @Autowired
    private CategoryMapper categoryMapper;
    @Autowired
    private TagMapper tagMapper;
    @Autowired
    private CommentMapper commentMapper;
    @Autowired
    private CacheManager cacheManager;

    public Page<Article> getAllArticles(Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        long offset = (long) page * size;
        long total = articleMapper.countAll();
        List<Article> list = articleMapper.selectAllWithDetails(offset, size);
        fillArticleDetails(list);
        return new PageImpl<>(list, pageable, total);
    }

    public Page<Article> searchArticles(String keyword, Pageable pageable) {
        String sanitizedKeyword = SqlEscaper.sanitizeInput(keyword);
        String escapedKeyword = SqlEscaper.escapeLikeSearch(sanitizedKeyword);
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        long offset = (long) page * size;
        long total = articleMapper.countSearch(escapedKeyword);
        List<Article> list = articleMapper.searchArticles(escapedKeyword, offset, size);
        fillArticleDetails(list);
        return new PageImpl<>(list, pageable, total);
    }

    @Cacheable(value = "articles", key = "#id")
    public Optional<Article> getArticleById(Long id) {
        Article article = articleMapper.selectWithDetailsById(id);
        if (article == null) {
            return Optional.empty();
        }
        fillArticleDetails(article);
        return Optional.of(article);
    }

    public void incrementViews(Long id) {
        try {
            // 单条 SQL 原子自增，确保低访问量尾数和并发请求都不会因 Redis 过期/删除而丢失。
            articleMapper.incrementViews(id, 1);
            evictArticleCache(id);
        } catch (Exception e) {
            logger.error("Failed to increment views for article {}", id, e);
        }
    }

    private void evictArticleCache(Long articleId) {
        Cache articles = cacheManager.getCache("articles");
        if (articles != null) {
            articles.evict(articleId);
        }
    }

    @Transactional
    @CacheEvict(value = "articles", key = "#article.id")
    public Article createArticle(Article article) {
        if (article.getTitle() != null) {
            article.setTitle(XssSanitizer.cleanStrict(article.getTitle()));
        }
        // 正文是 Markdown 源文本。HTML 清洗会把引用符号等 Markdown 语法转义，
        // 因此只在前端 Markdown 渲染时处理原始 HTML，不改写保存内容。
        if (article.getSummary() != null) {
            article.setSummary(XssSanitizer.cleanStrict(article.getSummary()));
        }
        if (article.getCategory() != null) {
            article.setCategoryId(article.getCategory().getId());
        }
        LocalDateTime now = LocalDateTime.now();
        article.setCreatedAt(now);
        article.setUpdatedAt(now);
        articleMapper.insert(article);
        if (article.getTags() != null && !article.getTags().isEmpty()) {
            List<Long> tagIds = article.getTags().stream().map(Tag::getId).collect(Collectors.toList());
            articleTagMapper.insertBatch(article.getId(), tagIds);
        }
        return article;
    }

    @Transactional
    @CacheEvict(value = "articles", key = "#article.id")
    public Article updateArticle(Article article) {
        if (article.getTitle() != null) {
            article.setTitle(XssSanitizer.cleanStrict(article.getTitle()));
        }
        // 与创建文章保持一致，更新时也必须原样保存 Markdown。
        if (article.getSummary() != null) {
            article.setSummary(XssSanitizer.cleanStrict(article.getSummary()));
        }
        if (article.getCategory() != null) {
            article.setCategoryId(article.getCategory().getId());
        }
        article.setUpdatedAt(LocalDateTime.now());
        articleMapper.updateById(article);
        articleTagMapper.deleteByArticleId(article.getId());
        if (article.getTags() != null && !article.getTags().isEmpty()) {
            List<Long> tagIds = article.getTags().stream().map(Tag::getId).collect(Collectors.toList());
            articleTagMapper.insertBatch(article.getId(), tagIds);
        }
        return article;
    }

    @Transactional
    @CacheEvict(value = "articles", key = "#id")
    public void deleteArticle(Long id) {
        commentMapper.delete(new LambdaQueryWrapper<Comment>().eq(Comment::getArticleId, id));
        articleTagMapper.deleteByArticleId(id);
        articleMapper.deleteById(id);
    }

    public List<Article> getRelatedArticles(Long articleId, Long categoryId) {
        List<Article> articles = articleMapper.selectRelatedArticles(articleId, categoryId);
        fillArticleDetails(articles);
        return articles.size() > 5 ? articles.subList(0, 5) : articles;
    }

    public List<Article> getLatestArticles(int limit) {
        List<Article> list = articleMapper.selectLatestForRss(limit);
        fillArticleDetails(list);
        return list;
    }

    public List<Article> getSitemapArticles(int limit) {
        return articleMapper.selectLatestForSitemap(limit);
    }

    /** 管理后台：获取所有文章（含草稿和已发布文章） */
    public Page<Article> getAllArticlesForAdmin(
            String keyword,
            String status,
            Long categoryId,
            Long tagId,
            Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        long offset = (long) page * size;
        String k = (keyword != null && !keyword.trim().isEmpty())
                ? SqlEscaper.escapeLikeSearch(SqlEscaper.sanitizeInput(keyword.trim()))
                : null;
        String normalizedStatus = status == null || status.trim().isEmpty()
                ? null
                : status.trim().toLowerCase(java.util.Locale.ROOT);
        if (normalizedStatus != null
                && !Set.of(Article.STATUS_DRAFT, Article.STATUS_PUBLISHED).contains(normalizedStatus)) {
            throw new IllegalArgumentException("不支持的文章状态");
        }
        if (categoryId != null && categoryId <= 0) {
            throw new IllegalArgumentException("分类参数无效");
        }
        if (tagId != null && tagId <= 0) {
            throw new IllegalArgumentException("标签参数无效");
        }
        long total = articleMapper.countAllForAdmin(k, normalizedStatus, categoryId, tagId);
        List<Article> list = articleMapper.selectAllForAdmin(
                k, normalizedStatus, categoryId, tagId, offset, size);
        fillArticleDetails(list);
        return new PageImpl<>(list, pageable, total);
    }

    public Page<Article> getArticlesByCategory(Long categoryId, Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        long offset = (long) page * size;
        long total = articleMapper.countByCategoryId(categoryId);
        List<Article> list = articleMapper.selectByCategoryId(categoryId, offset, size);
        fillArticleDetails(list);
        return new PageImpl<>(list, pageable, total);
    }

    public Page<Article> getArticlesByTag(Long tagId, Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        long offset = (long) page * size;
        long total = articleMapper.countByTagId(tagId);
        List<Article> list = articleMapper.selectByTagId(tagId, offset, size);
        fillArticleDetails(list);
        return new PageImpl<>(list, pageable, total);
    }

    public Page<Article> getHotArticles(Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        long offset = (long) page * size;
        long total = articleMapper.countHotArticles();
        List<Article> list = articleMapper.selectHotArticles(offset, size);
        fillArticleDetails(list);
        return new PageImpl<>(list, pageable, total);
    }

    private void fillArticleDetails(List<Article> articles) {
        if (articles == null || articles.isEmpty()) {
            return;
        }

        // Batch load categories
        Set<Long> categoryIds = articles.stream()
                .map(Article::getCategoryId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<Long, Category> categoryMap = categoryIds.isEmpty() ? Collections.emptyMap()
                : categoryMapper.selectByIds(new ArrayList<>(categoryIds)).stream()
                    .collect(Collectors.toMap(Category::getId, c -> c));

        // Batch load article-tag relations
        List<Long> articleIds = articles.stream().map(Article::getId).collect(Collectors.toList());
        List<com.example.blog.entity.ArticleTag> articleTags = articleTagMapper.selectByArticleIds(articleIds);
        Map<Long, List<Long>> articleTagIdsMap = new HashMap<>();
        for (com.example.blog.entity.ArticleTag at : articleTags) {
            articleTagIdsMap.computeIfAbsent(at.getArticleId(), k -> new ArrayList<>()).add(at.getTagId());
        }

        // Batch load all tags
        Set<Long> allTagIds = articleTags.stream().map(com.example.blog.entity.ArticleTag::getTagId).collect(Collectors.toSet());
        Map<Long, Tag> tagMap = allTagIds.isEmpty() ? Collections.emptyMap()
                : tagMapper.selectByIds(new ArrayList<>(allTagIds)).stream()
                    .collect(Collectors.toMap(Tag::getId, t -> t));

        // Assign to articles
        for (Article a : articles) {
            if (a.getCategoryId() != null) {
                a.setCategory(categoryMap.get(a.getCategoryId()));
            }
            List<Long> tagIds = articleTagIdsMap.getOrDefault(a.getId(), Collections.emptyList());
            Set<Tag> tags = new HashSet<>();
            for (Long tagId : tagIds) {
                Tag tag = tagMap.get(tagId);
                if (tag != null) {
                    tags.add(tag);
                }
            }
            a.setTags(tags);
        }
    }

    private void fillArticleDetails(Article article) {
        if (article == null) {
            return;
        }
        if (article.getCategoryId() != null) {
            Category category = categoryMapper.selectById(article.getCategoryId());
            article.setCategory(category);
        }
        List<Long> tagIds = articleTagMapper.selectTagIdsByArticleId(article.getId());
        if (tagIds != null && !tagIds.isEmpty()) {
            List<Tag> tags = tagMapper.selectByIds(tagIds);
            article.setTags(tags != null ? new HashSet<>(tags) : new HashSet<>());
        } else {
            article.setTags(new HashSet<>());
        }
    }

}
