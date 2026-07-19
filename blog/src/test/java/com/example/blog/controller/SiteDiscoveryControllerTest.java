package com.example.blog.controller;

import com.example.blog.entity.Article;
import com.example.blog.service.ArticleService;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SiteDiscoveryControllerTest {

    @Test
    void sitemapContainsPublicPagesAndPublishedArticles() {
        ArticleService articleService = mock(ArticleService.class);
        Article article = new Article();
        article.setId(42L);
        article.setUpdatedAt(LocalDateTime.of(2026, 7, 16, 10, 30));
        when(articleService.getSitemapArticles(1000)).thenReturn(List.of(article));
        SiteDiscoveryController controller = new SiteDiscoveryController(articleService, "https://blog.example.com/");

        String sitemap = controller.sitemap();

        verify(articleService).getSitemapArticles(1000);
        assertTrue(sitemap.contains("<loc>https://blog.example.com/</loc>"));
        assertFalse(sitemap.contains("<loc>https://blog.example.com/about</loc>"));
        assertTrue(sitemap.contains("<loc>https://blog.example.com/article/42</loc>"));
        assertTrue(sitemap.contains("<lastmod>2026-07-16</lastmod>"));
        assertFalse(sitemap.contains("//article/42"));
    }

    @Test
    void robotsPointsToSitemapAndHidesOwnerRoutes() {
        SiteDiscoveryController controller = new SiteDiscoveryController(mock(ArticleService.class), "https://blog.example.com");

        String robots = controller.robots();

        assertTrue(robots.contains("Disallow: /admin"));
        assertFalse(robots.contains("Disallow: /write"));
        assertTrue(robots.contains("Sitemap: https://blog.example.com/sitemap.xml"));
    }

    @Test
    void blankBaseUrlFallsBackToLocalFrontend() {
        SiteDiscoveryController controller = new SiteDiscoveryController(mock(ArticleService.class), "  ");

        assertTrue(controller.robots().contains("Sitemap: http://localhost:5173/sitemap.xml"));
    }
}
