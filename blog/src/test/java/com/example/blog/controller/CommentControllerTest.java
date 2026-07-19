package com.example.blog.controller;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.example.blog.config.TestSecurityConfig;
import com.example.blog.entity.Article;
import com.example.blog.entity.Comment;
import com.example.blog.mapper.ArticleMapper;
import com.example.blog.service.CommentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CommentController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        MybatisPlusAutoConfiguration.class
})
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommentService commentService;

    @MockitoBean
    private ArticleMapper articleMapper;

    private Article article;

    @BeforeEach
    void setUp() {
        article = new Article();
        article.setId(1L);
        article.setStatus(Article.STATUS_PUBLISHED);
        when(articleMapper.selectById(1L)).thenReturn(article);
    }

    @Test
    void anonymousGuestCommentIsAcceptedForModeration() throws Exception {
        mockMvc.perform(post("/api/comments/article/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"guestName\":\"Visitor\",\"content\":\"Hello\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.code").value(202))
                .andExpect(jsonPath("$.message").value("评论已提交，审核通过后显示"));

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentService).createGuestComment(captor.capture());
        assertEquals("Visitor", captor.getValue().getGuestName());
        assertEquals("Hello", captor.getValue().getContent());
        assertNull(captor.getValue().getParentId());
    }

    @Test
    void anonymousGuestCannotReply() throws Exception {
        mockMvc.perform(post("/api/comments/article/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"guestName\":\"Visitor\",\"content\":\"Hello\",\"parentId\":10}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("游客暂不支持回复评论"));

        verify(commentService, never()).createGuestComment(any());
        verify(commentService, never()).createReply(any(), any());
    }

    @Test
    void anonymousGuestCannotCommentOnNonPublicArticle() throws Exception {
        article.setStatus("draft");

        mockMvc.perform(post("/api/comments/article/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"guestName\":\"Visitor\",\"content\":\"Hello\"}"))
                .andExpect(status().isNotFound());

        verify(commentService, never()).createGuestComment(any());
    }

    @Test
    @WithMockUser(username = "admin", roles = "OWNER")
    void siteOwnerReplyIsMarkedAsOwnerComment() throws Exception {
        when(commentService.createReply(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));

        mockMvc.perform(post("/api/comments/article/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Owner reply\",\"parentId\":10}"))
                .andExpect(status().isOk());

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentService).createReply(org.mockito.ArgumentMatchers.eq(1L), captor.capture());
        assertEquals(true, captor.getValue().getOwnerComment());
        assertEquals(10L, captor.getValue().getParentId());
    }
}
