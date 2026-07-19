package com.example.blog.service;

import com.example.blog.entity.Category;
import com.example.blog.mapper.CategoryMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryMapper categoryMapper;

    @InjectMocks
    private CategoryService categoryService;

    @Test
    void returnsRequestedAdminCategoryPage() {
        Category category = new Category();
        category.setId(2L);
        category.setName("技术随笔");
        Category secondCategory = new Category();
        secondCategory.setId(1L);
        secondCategory.setName("默认分类");
        when(categoryMapper.countAll()).thenReturn(12L);
        when(categoryMapper.selectPageForAdmin(10L, 10)).thenReturn(List.of(category, secondCategory));

        Page<Category> result = categoryService.getCategoriesForAdmin(PageRequest.of(1, 10));

        assertEquals(12L, result.getTotalElements());
        assertEquals(2, result.getTotalPages());
        assertEquals("技术随笔", result.getContent().get(0).getName());
        verify(categoryMapper).selectPageForAdmin(10L, 10);
    }

    @Test
    void reordersCategoriesUsingTheirExistingSortPositions() {
        Category first = category(1L, "技术随笔", 10L);
        Category second = category(2L, "默认分类", 20L);
        when(categoryMapper.selectByIds(List.of(1L, 2L))).thenReturn(List.of(first, second));

        categoryService.reorderCategories(List.of(1L, 2L));

        verify(categoryMapper).updateSortOrder(1L, 20L);
        verify(categoryMapper).updateSortOrder(2L, 10L);
    }

    private Category category(Long id, String name, Long sortOrder) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        category.setSortOrder(sortOrder);
        return category;
    }
}
