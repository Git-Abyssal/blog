package com.example.blog.controller;

import com.example.blog.entity.Article;
import com.example.blog.service.ArticleService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** Public discovery files used by search engines and feed readers. */
@RestController
public class SiteDiscoveryController {

    private static final int SITEMAP_ARTICLE_LIMIT = 1000;

    private final ArticleService articleService;
    private final String baseUrl;

    public SiteDiscoveryController(
            ArticleService articleService,
            @Value("${app.base-url:http://localhost:5173}") String baseUrl) {
        this.articleService = articleService;
        String configured = (baseUrl == null || baseUrl.isBlank()) ? "http://localhost:5173" : baseUrl.trim();
        this.baseUrl = configured.replaceAll("/+$", "");
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String sitemap() {
        List<Article> articles = articleService.getSitemapArticles(SITEMAP_ARTICLE_LIMIT);
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        appendUrl(xml, baseUrl + "/", null);
        for (Article article : articles) {
            LocalDateTime lastModified = article.getUpdatedAt() != null
                    ? article.getUpdatedAt()
                    : article.getCreatedAt();
            appendUrl(xml, baseUrl + "/article/" + article.getId(), lastModified);
        }

        return xml.append("</urlset>\n").toString();
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public String robots() {
        return "User-agent: *\n"
                + "Allow: /\n"
                + "Disallow: /admin\n"
                + "Sitemap: " + baseUrl + "/sitemap.xml\n";
    }

    private static void appendUrl(StringBuilder xml, String location, LocalDateTime lastModified) {
        xml.append("  <url><loc>").append(escapeXml(location)).append("</loc>");
        if (lastModified != null) {
            xml.append("<lastmod>")
                    .append(lastModified.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE))
                    .append("</lastmod>");
        }
        xml.append("</url>\n");
    }

    private static String escapeXml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
