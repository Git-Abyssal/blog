package com.example.blog.mapper;

import com.example.blog.entity.ArticleTag;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ArticleTagMapper {

    int deleteByArticleId(@Param("articleId") Long articleId);

    List<Long> selectTagIdsByArticleId(@Param("articleId") Long articleId);

    int insertBatch(@Param("articleId") Long articleId, @Param("tagIds") List<Long> tagIds);

    List<ArticleTag> selectByArticleIds(@Param("articleIds") List<Long> articleIds);
}
