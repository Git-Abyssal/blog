package com.example.blog.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.example.blog.entity.Comment;
import com.example.blog.mapper.CommentMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import org.springframework.data.domain.PageRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentMapper commentMapper;
    @InjectMocks
    private CommentService commentService;

    @BeforeAll
    static void initMybatisPlusTableInfo() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant = new MapperBuilderAssistant(configuration, "");
        TableInfoHelper.initTableInfo(assistant, Comment.class);
    }

    @Test
    void createReplyIsMarkedAsOwnerComment() {
        Comment parent = new Comment();
        parent.setId(10L);
        parent.setArticleId(1L);
        parent.setStatus(Comment.STATUS_APPROVED);
        when(commentMapper.selectById(10L)).thenReturn(parent);

        Comment reply = new Comment();
        reply.setParentId(10L);

        commentService.createReply(1L, reply);

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        org.mockito.Mockito.verify(commentMapper).insert(captor.capture());
        assertEquals(true, captor.getValue().getOwnerComment());
        assertEquals(Comment.STATUS_APPROVED, captor.getValue().getStatus());
        assertNotNull(captor.getValue().getReviewedAt());
    }

    @Test
    void createGuestCommentIsAlwaysPendingAndTopLevel() {
        Comment guestComment = new Comment();
        guestComment.setGuestName("  visitor  ");
        guestComment.setContent("hello");

        commentService.createGuestComment(guestComment);

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentMapper).insert(captor.capture());
        Comment saved = captor.getValue();
        assertEquals("visitor", saved.getGuestName());
        assertEquals(Comment.STATUS_PENDING, saved.getStatus());
        assertEquals(false, saved.getOwnerComment());
        assertNull(saved.getParentId());
        assertNull(saved.getReviewedAt());
        assertNotNull(saved.getCreatedAt());
    }

    @Test
    void createGuestCommentRejectsReplies() {
        Comment guestReply = new Comment();
        guestReply.setGuestName("visitor");
        guestReply.setContent("hello");
        guestReply.setParentId(10L);

        assertThrows(IllegalArgumentException.class,
                () -> commentService.createGuestComment(guestReply));
    }

    @Test
    void createReplyRejectsPendingParent() {
        Comment pendingParent = new Comment();
        pendingParent.setId(10L);
        pendingParent.setArticleId(1L);
        pendingParent.setStatus(Comment.STATUS_PENDING);
        when(commentMapper.selectById(10L)).thenReturn(pendingParent);

        Comment reply = new Comment();
        reply.setParentId(10L);

        assertThrows(IllegalArgumentException.class,
                () -> commentService.createReply(1L, reply));
    }

    @Test
    void createSiteOwnerCommentIsImmediatelyApproved() {
        Comment comment = new Comment();
        comment.setGuestName("forged guest");

        commentService.createOwnerComment(comment);

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentMapper).insert(captor.capture());
        assertEquals(true, captor.getValue().getOwnerComment());
        assertNull(captor.getValue().getGuestName());
        assertEquals(Comment.STATUS_APPROVED, captor.getValue().getStatus());
        assertNotNull(captor.getValue().getReviewedAt());
    }

    @Test
    void approveCommentChangesPendingCommentToApproved() {
        Comment pending = new Comment();
        pending.setId(10L);
        pending.setStatus(Comment.STATUS_PENDING);
        when(commentMapper.selectById(10L)).thenReturn(pending);

        Comment approved = commentService.approveComment(10L);

        assertEquals(Comment.STATUS_APPROVED, approved.getStatus());
        assertNotNull(approved.getReviewedAt());
        verify(commentMapper).updateById(pending);
    }

    @Test
    void getCommentsByStatusRejectsUnknownStatus() {
        assertThrows(IllegalArgumentException.class,
                () -> commentService.getCommentsByStatus("rejected", PageRequest.of(0, 20)));
    }

    @Test
    void deleteCommentDeletesChildComments() {
        Comment child = new Comment();
        child.setId(11L);
        when(commentMapper.selectList(any(Wrapper.class))).thenReturn(List.of(child));

        commentService.deleteComment(10L);

        verify(commentMapper).delete(any(Wrapper.class));
        verify(commentMapper).deleteById(10L);
    }
}
