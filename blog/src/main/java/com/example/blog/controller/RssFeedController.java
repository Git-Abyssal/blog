package com.example.blog.controller;

import com.example.blog.entity.Article;
import com.example.blog.service.ArticleService;
import com.rometools.rome.feed.atom.Entry;
import com.rometools.rome.feed.atom.Feed;
import com.rometools.rome.feed.atom.Content;
import com.rometools.rome.feed.atom.Link;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

/**
 * RSS/Atom 订阅源接口
 */
@Controller
@RequestMapping("/rss")
public class RssFeedController {

    private static final int MIN_ARTICLE_LIMIT = 1;
    private static final int MAX_ARTICLE_LIMIT = 100;

    @Autowired
    private ArticleService articleService;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${blog.site-title:Abyssal的分享}")
    private String siteTitle;

    @Value("${blog.author-name:Abyssal}")
    private String authorName;

    @GetMapping(value = "/articles", produces = MediaType.APPLICATION_ATOM_XML_VALUE)
    @ResponseBody
    public Feed getArticlesFeed(
            @RequestParam(defaultValue = "20") int limit
    ) {
        // 获取最新的文章
        int boundedLimit = Math.max(MIN_ARTICLE_LIMIT, Math.min(limit, MAX_ARTICLE_LIMIT));
        List<Article> articles = articleService.getLatestArticles(boundedLimit);
        String siteUrl = normalizedBaseUrl();

        Feed feed = new Feed();
        feed.setFeedType("atom_1.0");
        feed.setTitle(siteTitle);
        feed.setId(siteUrl + "/rss/articles");
        feed.setUpdated(Date.from(LocalDateTime.now().atZone(ZoneId.systemDefault()).toInstant()));

        for (Article article : articles) {
            Entry entry = new Entry();
            entry.setTitle(article.getTitle());
            entry.setId(siteUrl + "/article/" + article.getId());
            LocalDateTime updated = article.getUpdatedAt() != null ? article.getUpdatedAt() : article.getCreatedAt();
            if (updated != null) {
                entry.setUpdated(Date.from(updated.atZone(ZoneId.systemDefault()).toInstant()));
            }

            // 摘要
            String summary = article.getSummary();
            if (summary == null || summary.isEmpty()) {
                String content = article.getContent();
                summary = (content != null && content.length() > 200)
                    ? content.substring(0, 200) + "..."
                    : (content != null ? content : "");
            }

            // 内容（Rome Atom Entry 使用 setContents(List)）
            Content content = new Content();
            content.setValue(summary);
            entry.setContents(List.of(content));

            // 链接
            Link link = new Link();
            link.setHref(siteUrl + "/article/" + article.getId());
            entry.setAlternateLinks(List.of(link));

            com.rometools.rome.feed.atom.Person author = new com.rometools.rome.feed.atom.Person();
            author.setName(authorName);
            entry.setAuthors(List.of(author));

            feed.getEntries().add(entry);
        }

        return feed;
    }

    private String normalizedBaseUrl() {
        String configured = (baseUrl == null || baseUrl.isBlank()) ? "http://localhost:5173" : baseUrl.trim();
        return configured.replaceAll("/+$", "");
    }
}
