package com.example.blog.controller;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.example.blog.config.TestSecurityConfig;
import com.example.blog.service.ArticleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminArticleController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        MybatisPlusAutoConfiguration.class
})
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
class AdminArticleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ArticleService articleService;

    @Test
    void passesArticleFiltersToService() throws Exception {
        when(articleService.getAllArticlesForAdmin(
                org.mockito.ArgumentMatchers.eq("React"),
                org.mockito.ArgumentMatchers.eq("draft"),
                org.mockito.ArgumentMatchers.eq(2L),
                org.mockito.ArgumentMatchers.eq(3L),
                argThat(pageable -> pageable.getPageNumber() == 1 && pageable.getPageSize() == 10)))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/admin/articles")
                        .param("keyword", "React")
                        .param("status", "draft")
                        .param("categoryId", "2")
                        .param("tagId", "3")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(articleService).getAllArticlesForAdmin(
                org.mockito.ArgumentMatchers.eq("React"),
                org.mockito.ArgumentMatchers.eq("draft"),
                org.mockito.ArgumentMatchers.eq(2L),
                org.mockito.ArgumentMatchers.eq(3L),
                argThat(pageable -> pageable.getPageNumber() == 1 && pageable.getPageSize() == 10));
    }
}
