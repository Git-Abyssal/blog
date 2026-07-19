package com.example.blog.controller;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.example.blog.config.TestSecurityConfig;
import com.example.blog.entity.Comment;
import com.example.blog.service.CommentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminCommentController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        MybatisPlusAutoConfiguration.class
})
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
class AdminCommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommentService commentService;

    @Test
    @WithMockUser(roles = "USER")
    void regularUserCannotOpenModerationApi() throws Exception {
        mockMvc.perform(get("/api/admin/comments"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "OWNER")
    void adminCanListPendingComments() throws Exception {
        Comment pending = new Comment();
        pending.setId(10L);
        pending.setGuestName("Visitor");
        pending.setArticleId(1L);
        pending.setArticleTitle("Article");
        pending.setStatus(Comment.STATUS_PENDING);
        when(commentService.getCommentsByStatus(eq(Comment.STATUS_PENDING), any()))
                .thenReturn(new PageImpl<>(List.of(pending)));

        mockMvc.perform(get("/api/admin/comments").param("status", "pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].guestName").value("Visitor"))
                .andExpect(jsonPath("$.content[0].articleId").value(1))
                .andExpect(jsonPath("$.content[0].articleTitle").value("Article"));
    }

    @Test
    @WithMockUser(roles = "OWNER")
    void adminCanApprovePendingComment() throws Exception {
        Comment approved = new Comment();
        approved.setId(10L);
        approved.setStatus(Comment.STATUS_APPROVED);
        when(commentService.approveComment(10L)).thenReturn(approved);

        mockMvc.perform(post("/api/admin/comments/10/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("approved"));
    }

    @Test
    @WithMockUser(roles = "OWNER")
    void adminCanDeleteComment() throws Exception {
        Comment comment = new Comment();
        comment.setId(10L);
        when(commentService.getCommentById(10L)).thenReturn(Optional.of(comment));

        mockMvc.perform(delete("/api/admin/comments/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("评论已删除"));

        verify(commentService).deleteComment(10L);
    }
}
