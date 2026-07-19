package com.example.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.blog.entity.Comment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CommentMapper extends BaseMapper<Comment> {

    List<Comment> selectTopLevelByArticleId(@Param("articleId") Long articleId, @Param("offset") long offset, @Param("size") int size);
    long countTopLevelByArticleId(@Param("articleId") Long articleId);
    List<Comment> selectRepliesByParentIds(@Param("parentIds") List<Long> parentIds);

    List<Comment> selectByStatus(@Param("status") String status,
                                 @Param("offset") long offset,
                                 @Param("size") int size);

    long countByStatus(@Param("status") String status);
}
