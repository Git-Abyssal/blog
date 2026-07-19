package com.example.blog.service;

import com.example.blog.entity.Tag;
import com.example.blog.mapper.TagMapper;
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
public class TagService {

    @Autowired
    private TagMapper tagMapper;

    @Cacheable(value = "tags")
    public List<Tag> getAllTags() {
        return tagMapper.selectList(new QueryWrapper<Tag>()
                .orderByDesc("sort_order")
                .orderByDesc("id"));
    }

    public Page<Tag> getTagsForAdmin(Pageable pageable) {
        int size = pageable.getPageSize();
        long offset = (long) pageable.getPageNumber() * size;
        long total = tagMapper.countAll();
        List<Tag> tags = tagMapper.selectPageForAdmin(offset, size);
        return new PageImpl<>(tags, pageable, total);
    }

    @Transactional
    @CacheEvict(value = "tags", allEntries = true)
    public Tag createTag(Tag tag) {
        tag.setSortOrder(0L);
        tagMapper.insert(tag);
        tag.setSortOrder(tag.getId());
        tagMapper.updateSortOrder(tag.getId(), tag.getSortOrder());
        return tag;
    }

    @Transactional
    @CacheEvict(value = "tags", allEntries = true)
    public Tag updateTag(Long id, Tag request) {
        Tag tag = tagMapper.selectById(id);
        if (tag == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "标签不存在");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("标签名称不能为空");
        }
        tag.setName(request.getName().trim());
        tagMapper.updateById(tag);
        return tag;
    }

    @Transactional
    @CacheEvict(value = "tags", allEntries = true)
    public void deleteTag(Long id) {
        tagMapper.deleteById(id);
    }

    @Transactional
    @CacheEvict(value = "tags", allEntries = true)
    public void reorderTags(List<Long> orderedIds) {
        validateOrderedIds(orderedIds);
        List<Tag> tags = tagMapper.selectByIds(orderedIds);
        if (tags.size() != orderedIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "标签列表包含不存在的标签");
        }

        Map<Long, Tag> tagsById = tags.stream()
                .collect(Collectors.toMap(Tag::getId, Function.identity()));
        List<Long> sortOrders = tags.stream()
                .map(Tag::getSortOrder)
                .sorted(java.util.Comparator.reverseOrder())
                .toList();

        for (int index = 0; index < orderedIds.size(); index++) {
            Long id = orderedIds.get(index);
            Tag tag = tagsById.get(id);
            Long sortOrder = sortOrders.get(index);
            tagMapper.updateSortOrder(tag.getId(), sortOrder);
        }
    }

    private void validateOrderedIds(List<Long> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "排序列表不能为空");
        }
        if (orderedIds.stream().anyMatch(java.util.Objects::isNull)
                || new HashSet<>(orderedIds).size() != orderedIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "排序列表包含重复或无效的标签");
        }
    }
}
