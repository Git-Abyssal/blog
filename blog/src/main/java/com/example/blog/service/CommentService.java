package com.example.blog.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.blog.entity.Comment;
import com.example.blog.mapper.CommentMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CommentService {

    @Autowired
    private CommentMapper commentMapper;

    public Page<Comment> getCommentsByStatus(String status, Pageable pageable) {
        requireSupportedStatus(status);
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        long offset = (long) page * size;
        long total = commentMapper.countByStatus(status);
        List<Comment> list = commentMapper.selectByStatus(status, offset, size);
        return new PageImpl<>(list, pageable, total);
    }

    @Transactional
    public Comment createGuestComment(Comment comment) {
        if (comment.getGuestName() == null || comment.getGuestName().isBlank()) {
            throw new IllegalArgumentException("游客昵称不能为空");
        }
        if (comment.getParentId() != null) {
            throw new IllegalArgumentException("游客暂不支持回复评论");
        }
        comment.setOwnerComment(false);
        comment.setGuestName(comment.getGuestName().trim());
        comment.setParentId(null);
        comment.setStatus(Comment.STATUS_PENDING);
        comment.setReviewedAt(null);
        comment.setCreatedAt(LocalDateTime.now());
        commentMapper.insert(comment);
        return comment;
    }

    @Transactional
    public Comment createOwnerComment(Comment comment) {
        comment.setGuestName(null);
        comment.setOwnerComment(true);
        comment.setStatus(Comment.STATUS_APPROVED);
        comment.setReviewedAt(LocalDateTime.now());
        comment.setCreatedAt(LocalDateTime.now());
        commentMapper.insert(comment);
        return comment;
    }

    @Transactional
    public void deleteComment(Long id) {
        List<Comment> children = commentMapper.selectList(
                new LambdaQueryWrapper<Comment>().select(Comment::getId).eq(Comment::getParentId, id));
        if (!children.isEmpty()) {
            List<Long> childIds = children.stream().map(Comment::getId).collect(Collectors.toList());
            commentMapper.delete(new LambdaQueryWrapper<Comment>().in(Comment::getId, childIds));
        }
        commentMapper.deleteById(id);
    }

    public java.util.Optional<Comment> getCommentById(Long id) {
        Comment c = commentMapper.selectById(id);
        return java.util.Optional.ofNullable(c);
    }

    @Transactional
    public Comment approveComment(Long id) {
        Comment comment = commentMapper.selectById(id);
        if (comment == null) {
            throw new IllegalArgumentException("评论不存在");
        }
        if (Comment.STATUS_APPROVED.equals(comment.getStatus())) {
            return comment;
        }
        if (!Comment.STATUS_PENDING.equals(comment.getStatus())) {
            throw new IllegalArgumentException("评论状态不允许审核通过");
        }
        comment.setStatus(Comment.STATUS_APPROVED);
        comment.setReviewedAt(LocalDateTime.now());
        commentMapper.updateById(comment);
        return comment;
    }

    public Page<Comment> getTopLevelComments(Long articleId, Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        long offset = (long) page * size;
        long total = commentMapper.countTopLevelByArticleId(articleId);
        List<Comment> topLevel = commentMapper.selectTopLevelByArticleId(articleId, offset, size);

        // Batch-load replies for top-level comments
        if (!topLevel.isEmpty()) {
            List<Long> parentIds = topLevel.stream().map(Comment::getId).collect(Collectors.toList());
            List<Comment> allReplies = commentMapper.selectRepliesByParentIds(parentIds);
            Map<Long, List<Comment>> repliesMap = allReplies.stream()
                    .collect(Collectors.groupingBy(Comment::getParentId));
            for (Comment c : topLevel) {
                c.setReplies(repliesMap.getOrDefault(c.getId(), new ArrayList<>()));
            }
        }

        return new PageImpl<>(topLevel, pageable, total);
    }

    @Transactional
    public Comment createReply(Long articleId, Comment comment) {
        comment.setArticleId(articleId);
        comment.setGuestName(null);
        comment.setOwnerComment(true);
        comment.setStatus(Comment.STATUS_APPROVED);
        comment.setReviewedAt(LocalDateTime.now());
        comment.setCreatedAt(LocalDateTime.now());

        // Validate parent exists and limit nesting to 1 level
        if (comment.getParentId() != null) {
            Comment parent = commentMapper.selectById(comment.getParentId());
            if (parent == null || !Comment.STATUS_APPROVED.equals(parent.getStatus())) {
                throw new IllegalArgumentException("父评论不存在");
            }
            Long parentArticleId = parent.getArticleId();
            if (parentArticleId == null || !parentArticleId.equals(articleId)) {
                throw new IllegalArgumentException("父评论不属于当前文章");
            }
            // If parent itself is a reply, remap to root
            if (parent.getParentId() != null) {
                Comment root = commentMapper.selectById(parent.getParentId());
                if (root == null || !Comment.STATUS_APPROVED.equals(root.getStatus())
                        || root.getArticleId() == null || !root.getArticleId().equals(articleId)) {
                    throw new IllegalArgumentException("父评论不属于当前文章");
                }
                comment.setParentId(root.getId());
            }
        }

        commentMapper.insert(comment);

        return comment;
    }

    private void requireSupportedStatus(String status) {
        if (!Comment.STATUS_PENDING.equals(status) && !Comment.STATUS_APPROVED.equals(status)) {
            throw new IllegalArgumentException("不支持的评论状态");
        }
    }
}
