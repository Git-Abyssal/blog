package com.example.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.blog.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface CategoryMapper extends BaseMapper<Category> {

    @Select("SELECT COUNT(*) FROM categories")
    long countAll();

    @Select("SELECT id, name, sort_order FROM categories ORDER BY sort_order DESC, id DESC LIMIT #{limit} OFFSET #{offset}")
    List<Category> selectPageForAdmin(@Param("offset") long offset, @Param("limit") int limit);

    @Update("UPDATE categories SET sort_order = #{sortOrder} WHERE id = #{id}")
    int updateSortOrder(@Param("id") Long id, @Param("sortOrder") Long sortOrder);
}
