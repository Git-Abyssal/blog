package com.example.blog.controller;

import com.example.blog.entity.Article;
import com.example.blog.service.ArticleService;
import com.rometools.rome.feed.atom.Feed;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RssFeedControllerTest {

    @Mock
    private ArticleService articleService;

    @InjectMocks
    private RssFeedController controller;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(controller, "siteTitle", "测试博客");
        ReflectionTestUtils.setField(controller, "authorName", "测试作者");
    }

    @Test
    void clampsNegativeLimitToMinimum() {
        when(articleService.getLatestArticles(1)).thenReturn(List.of());

        Feed feed = controller.getArticlesFeed(-5);

        verify(articleService).getLatestArticles(1);
        assertEquals("atom_1.0", feed.getFeedType());
        assertEquals("测试博客", feed.getTitle());
        assertTrue(feed.getEntries().isEmpty());
    }

    @Test
    void clampsLargeLimitToMaximum() {
        when(articleService.getLatestArticles(100)).thenReturn(List.of());

        Feed feed = controller.getArticlesFeed(1000);

        verify(articleService).getLatestArticles(100);
        assertTrue(feed.getEntries().isEmpty());
    }

    @Test
    void usesArticleContentWhenSummaryIsMissing() {
        Article article = new Article();
        article.setId(1L);
        article.setTitle("Article without summary");
        article.setContent("正文内容可用于订阅摘要");
        when(articleService.getLatestArticles(20)).thenReturn(List.of(article));

        Feed feed = controller.getArticlesFeed(20);

        assertEquals("正文内容可用于订阅摘要",
                feed.getEntries().get(0).getContents().get(0).getValue());
        assertEquals("测试作者", feed.getEntries().get(0).getAuthors().get(0).getName());
    }

    @Test
    void removesTrailingSlashFromConfiguredBaseUrl() {
        ReflectionTestUtils.setField(controller, "baseUrl", "https://blog.example.com/");
        when(articleService.getLatestArticles(20)).thenReturn(List.of());

        Feed feed = controller.getArticlesFeed(20);

        assertEquals("https://blog.example.com/rss/articles", feed.getId());
    }
}
