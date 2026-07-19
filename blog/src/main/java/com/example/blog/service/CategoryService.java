package com.example.blog.service;

import com.example.blog.entity.Category;
import com.example.blog.mapper.CategoryMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.HashSet;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    @Autowired
    private CategoryMapper categoryMapper;

    @Cacheable(value = "categories")
    public List<Category> getAllCategories() {
        return categoryMapper.selectList(new QueryWrapper<Category>()
                .orderByDesc("sort_order")
                .orderByDesc("id"));
    }

    public Page<Category> getCategoriesForAdmin(Pageable pageable) {
        int size = pageable.getPageSize();
        long offset = (long) pageable.getPageNumber() * size;
        long total = categoryMapper.countAll();
        List<Category> categories = categoryMapper.selectPageForAdmin(offset, size);
        return new PageImpl<>(categories, pageable, total);
    }

    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public Category createCategory(Category category) {
        category.setSortOrder(0L);
        categoryMapper.insert(category);
        category.setSortOrder(category.getId());
        categoryMapper.updateSortOrder(category.getId(), category.getSortOrder());
        return category;
    }

    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public Category updateCategory(Long id, Category request) {
        Category category = categoryMapper.selectById(id);
        if (category == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "分类不存在");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("分类名称不能为空");
        }
        category.setName(request.getName().trim());
        categoryMapper.updateById(category);
        return category;
    }

    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public void deleteCategory(Long id) {
        categoryMapper.deleteById(id);
    }

    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public void reorderCategories(List<Long> orderedIds) {
        validateOrderedIds(orderedIds);
        List<Category> categories = categoryMapper.selectByIds(orderedIds);
        if (categories.size() != orderedIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "分类列表包含不存在的分类");
        }

        Map<Long, Category> categoriesById = categories.stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));
        List<Long> sortOrders = categories.stream()
                .map(Category::getSortOrder)
                .sorted(java.util.Comparator.reverseOrder())
                .toList();

        for (int index = 0; index < orderedIds.size(); index++) {
            Long id = orderedIds.get(index);
            Category category = categoriesById.get(id);
            Long sortOrder = sortOrders.get(index);
            categoryMapper.updateSortOrder(category.getId(), sortOrder);
        }
    }

    private void validateOrderedIds(List<Long> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "排序列表不能为空");
        }
        if (orderedIds.stream().anyMatch(java.util.Objects::isNull)
                || new HashSet<>(orderedIds).size() != orderedIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "排序列表包含重复或无效的分类");
        }
    }
}
