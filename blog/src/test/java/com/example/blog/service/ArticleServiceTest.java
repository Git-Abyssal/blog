package com.example.blog.service;

import com.example.blog.entity.Article;
import com.example.blog.mapper.ArticleMapper;
import com.example.blog.mapper.ArticleTagMapper;
import com.example.blog.mapper.CategoryMapper;
import com.example.blog.mapper.CommentMapper;
import com.example.blog.mapper.TagMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleServiceTest {

    @Mock
    private ArticleMapper articleMapper;
    @Mock
    private ArticleTagMapper articleTagMapper;
    @Mock
    private CommentMapper commentMapper;
    @Mock
    private CategoryMapper categoryMapper;
    @Mock
    private TagMapper tagMapper;
    @Mock
    private CacheManager cacheManager;

    @InjectMocks
    private ArticleService articleService;

    private Article testArticle;

    @BeforeEach
    void setUp() {
        testArticle = new Article();
        testArticle.setId(1L);
        testArticle.setTitle("Test Article");
        testArticle.setContent("Test Content");
        testArticle.setViews(0);
    }

    @Test
    void testGetArticleById_Found() {
        when(articleMapper.selectWithDetailsById(1L)).thenReturn(testArticle);
        when(articleTagMapper.selectTagIdsByArticleId(1L)).thenReturn(Collections.emptyList());

        Optional<Article> result = articleService.getArticleById(1L);

        assertTrue(result.isPresent());
        assertEquals("Test Article", result.get().getTitle());
        verify(articleMapper, times(1)).selectWithDetailsById(1L);
    }

    @Test
    void testGetArticleById_NotFound() {
        when(articleMapper.selectWithDetailsById(999L)).thenReturn(null);

        Optional<Article> result = articleService.getArticleById(999L);

        assertFalse(result.isPresent());
        verify(articleMapper, times(1)).selectWithDetailsById(999L);
    }

    @Test
    void incrementViewsUsesOneAtomicDatabaseUpdatePerView() {
        articleService.incrementViews(1L);

        verify(articleMapper).incrementViews(1L, 1);
    }

    @Test
    void latestArticlesForRssUseContentQuery() {
        when(articleMapper.selectLatestForRss(20)).thenReturn(Collections.singletonList(testArticle));

        var articles = articleService.getLatestArticles(20);

        assertEquals("Test Content", articles.get(0).getContent());
        verify(articleMapper).selectLatestForRss(20);
        verify(articleMapper, never()).selectAllWithDetails(anyLong(), anyInt());
    }

    @Test
    void sitemapArticlesUseMetadataOnlyQuery() {
        when(articleMapper.selectLatestForSitemap(1000)).thenReturn(Collections.singletonList(testArticle));

        var articles = articleService.getSitemapArticles(1000);

        assertEquals(1, articles.size());
        verify(articleMapper).selectLatestForSitemap(1000);
        verify(articleMapper, never()).selectLatestForRss(anyInt());
    }

    @Test
    void adminArticleFiltersArePassedToCountAndPageQueries() {
        when(articleMapper.countAllForAdmin("React", "draft", 2L, 3L)).thenReturn(12L);
        when(articleMapper.selectAllForAdmin("React", "draft", 2L, 3L, 0L, 10))
                .thenReturn(Collections.emptyList());

        var result = articleService.getAllArticlesForAdmin(
                " React ", "DRAFT", 2L, 3L, PageRequest.of(0, 10));

        assertEquals(12L, result.getTotalElements());
        verify(articleMapper).countAllForAdmin("React", "draft", 2L, 3L);
        verify(articleMapper).selectAllForAdmin("React", "draft", 2L, 3L, 0L, 10);
    }

    @Test
    void adminArticleFiltersRejectUnknownStatus() {
        assertThrows(IllegalArgumentException.class, () ->
                articleService.getAllArticlesForAdmin(
                        null, "archived", null, null, PageRequest.of(0, 10)));

        verify(articleMapper, never()).countAllForAdmin(any(), any(), any(), any());
    }

    @Test
    void testCreateArticle() {
        when(articleMapper.insert(any(Article.class))).thenAnswer(inv -> {
            Article a = inv.getArgument(0);
            a.setId(1L);
            return 1;
        });
        Article result = articleService.createArticle(testArticle);

        assertNotNull(result);
        assertEquals("Test Article", result.getTitle());
        verify(articleMapper, times(1)).insert(any(Article.class));
    }

    @Test
    void createArticlePreservesMarkdownBlockquotes() {
        String markdown = "保存前\n\n> 把这个文章编辑器优化一下。\n\n保存后";
        testArticle.setContent(markdown);

        articleService.createArticle(testArticle);

        assertEquals(markdown, testArticle.getContent());
        verify(articleMapper).insert(testArticle);
    }

    @Test
    void testUpdateArticle() {
        when(articleMapper.updateById(any(Article.class))).thenReturn(1);
        Article result = articleService.updateArticle(testArticle);

        assertNotNull(result);
        verify(articleMapper, times(1)).updateById(any(Article.class));
    }

    @Test
    void updateArticlePreservesMarkdownBlockquotes() {
        String markdown = "保存前\n\n> 把这个文章编辑器优化一下。\n\n保存后";
        testArticle.setContent(markdown);

        articleService.updateArticle(testArticle);

        assertEquals(markdown, testArticle.getContent());
        verify(articleMapper).updateById(testArticle);
    }

    @Test
    void testDeleteArticle() {
        when(articleMapper.deleteById(1L)).thenReturn(1);

        articleService.deleteArticle(1L);

        verify(articleMapper, times(1)).deleteById(1L);
        verify(commentMapper).delete(any());
        verify(articleTagMapper).deleteByArticleId(1L);
    }
}
