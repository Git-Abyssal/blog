package com.example.blog.config;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.example.blog.security.FirstLoginPasswordChangeFilter;
import com.example.blog.security.JwtAuthenticationFilter;
import com.example.blog.security.RateLimitFilter;
import com.example.blog.security.RestApiCsrfFilter;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = SecurityConfigAuthorizationTest.TestEndpoints.class,
        excludeAutoConfiguration = MybatisPlusAutoConfiguration.class
)
@Import({SecurityConfig.class, SecurityConfigAuthorizationTest.TestEndpoints.class})
@ActiveProfiles("security-test")
class SecurityConfigAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private FirstLoginPasswordChangeFilter firstLoginPasswordChangeFilter;
    @MockitoBean
    private RestApiCsrfFilter restApiCsrfFilter;

    @BeforeEach
    void makeCustomFiltersPassThrough() throws Exception {
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(rateLimitFilter).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(firstLoginPasswordChangeFilter).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(restApiCsrfFilter).doFilter(any(), any(), any());
    }

    @Test
    void publicReadEndpointsRemainAnonymous() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/health/liveness"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/health/readiness"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/articles"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/articles/12"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/articles/12/related"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/comments/article/12/threaded")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/sitemap.xml"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/robots.txt"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/rss/articles"))
                .andExpect(status().isOk());
    }

    @Test
    void customSecurityFiltersRunOnlyOncePerRequest() throws Exception {
        mockMvc.perform(get("/api/articles"))
                .andExpect(status().isOk());

        verify(jwtAuthenticationFilter, times(1)).doFilter(any(), any(), any());
        verify(rateLimitFilter, times(1)).doFilter(any(), any(), any());
        verify(firstLoginPasswordChangeFilter, times(1)).doFilter(any(), any(), any());
        verify(restApiCsrfFilter, times(1)).doFilter(any(), any(), any());
    }

    @Test
    void unknownApiEndpointIsNotCoveredByPublicReadRules() throws Exception {
        mockMvc.perform(get("/api/private"))
                .andExpect(status().isForbidden());
    }

    @Test
    void guestMaySubmitCommentButMayNotWriteArticle() throws Exception {
        mockMvc.perform(post("/api/comments/article/12")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonOwnerAuthorityCannotWriteOrUseCommentModeration() throws Exception {
        mockMvc.perform(post("/api/articles")
                        .with(user("reader").roles("READER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/comments")
                        .with(user("reader").roles("READER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/categories")
                        .with(user("reader").roles("READER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/tags")
                        .with(user("reader").roles("READER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/tags/1")
                        .with(user("reader").roles("READER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void ownerRoleCanWriteAndUseCommentModeration() throws Exception {
        mockMvc.perform(post("/api/articles")
                        .with(user("owner").roles("OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/comments")
                        .with(user("owner").roles("OWNER")))
                .andExpect(status().isOk())
                .andExpect(content().string("ok"));
        mockMvc.perform(get("/api/admin/categories")
                        .with(user("owner").roles("OWNER")))
                .andExpect(status().isOk())
                .andExpect(content().string("ok"));
        mockMvc.perform(get("/api/admin/tags")
                        .with(user("owner").roles("OWNER")))
                .andExpect(status().isOk())
                .andExpect(content().string("ok"));
        mockMvc.perform(put("/api/tags/1")
                        .with(user("owner").roles("OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(content().string("ok"));
    }

    @Test
    void ownerLoginIsPublic() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
    }

    @RestController
    public static class TestEndpoints {
        @GetMapping({
                "/health", "/health/liveness", "/health/readiness",
                "/api/articles", "/api/articles/12", "/api/articles/12/related",
                "/api/private",
                "/api/comments/article/12/threaded", "/api/admin/comments", "/api/admin/categories", "/api/admin/tags",
                "/sitemap.xml", "/robots.txt", "/rss/articles"
        })
        String getEndpoint() {
            return "ok";
        }

        @PostMapping({
                "/api/auth/login", "/api/articles",
                "/api/comments/article/12"
        })
        String postEndpoint() {
            return "ok";
        }

        @PutMapping("/api/tags/1")
        String putEndpoint() {
            return "ok";
        }
    }
}
