package com.example.blog.controller;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.example.blog.config.TestSecurityConfig;
import com.example.blog.entity.Article;
import com.example.blog.mapper.CategoryMapper;
import com.example.blog.mapper.TagMapper;
import com.example.blog.service.ArticleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ArticleController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        MybatisPlusAutoConfiguration.class
})
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
class ArticleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ArticleService articleService;

    @MockitoBean
    private CategoryMapper categoryMapper;

    @MockitoBean
    private TagMapper tagMapper;

    private Article testArticle;

    @BeforeEach
    void setUp() {
        testArticle = new Article();
        testArticle.setId(1L);
        testArticle.setTitle("Test Article");
        testArticle.setContent("Test Content");
        testArticle.setStatus(Article.STATUS_PUBLISHED);
    }

    @Test
    void testGetArticleById_Success() throws Exception {
        when(articleService.getArticleById(1L)).thenReturn(Optional.of(testArticle));

        mockMvc.perform(get("/api/articles/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Article"))
                .andExpect(jsonPath("$.content").value("Test Content"))
                .andExpect(jsonPath("$.author").doesNotExist());

        verify(articleService).incrementViews(1L);
    }

    @Test
    void refreshingArticleDoesNotIncrementViews() throws Exception {
        when(articleService.getArticleById(1L)).thenReturn(Optional.of(testArticle));

        mockMvc.perform(get("/api/articles/1").param("trackView", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Article"));

        verify(articleService, never()).incrementViews(1L);
    }

    @Test
    void testGetArticleById_NotFound() throws Exception {
        when(articleService.getArticleById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/articles/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "admin", roles = "OWNER")
    void createArticle_PublishesImmediatelyForSingleOwner() throws Exception {
        when(articleService.createArticle(any(Article.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "单作者博客文章",
                                  "content": "正文内容"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("published"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "OWNER")
    void savingPublishedArticleAsDraftDoesNotTakeItOffline() throws Exception {
        when(articleService.getArticleById(1L)).thenReturn(Optional.of(testArticle));
        when(articleService.updateArticle(any(Article.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/articles/draft")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "id": 1,
                                  "title": "修改后的文章",
                                  "content": "修改后的正文"
                                }
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("published"));
    }

}
