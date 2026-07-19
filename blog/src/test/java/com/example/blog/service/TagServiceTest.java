package com.example.blog.service;

import com.example.blog.entity.Tag;
import com.example.blog.mapper.TagMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TagServiceTest {

    @Mock
    private TagMapper tagMapper;

    @InjectMocks
    private TagService tagService;

    @Test
    void returnsRequestedAdminTagPage() {
        Tag first = tag(12L, "React");
        Tag second = tag(11L, "Spring Boot");
        when(tagMapper.countAll()).thenReturn(12L);
        when(tagMapper.selectPageForAdmin(10L, 10)).thenReturn(List.of(first, second));

        Page<Tag> result = tagService.getTagsForAdmin(PageRequest.of(1, 10));

        assertEquals(12L, result.getTotalElements());
        assertEquals(2, result.getTotalPages());
        assertEquals("React", result.getContent().get(0).getName());
        verify(tagMapper).selectPageForAdmin(10L, 10);
    }

    @Test
    void updatesExistingTag() {
        Tag existing = tag(3L, "React");
        when(tagMapper.selectById(3L)).thenReturn(existing);

        Tag result = tagService.updateTag(3L, tag(null, " React 19 "));

        assertSame(existing, result);
        assertEquals("React 19", result.getName());
        verify(tagMapper).updateById(existing);
    }

    @Test
    void reordersTagsUsingTheirExistingSortPositions() {
        Tag first = tag(1L, "React");
        first.setSortOrder(10L);
        Tag second = tag(2L, "Spring Boot");
        second.setSortOrder(20L);
        when(tagMapper.selectByIds(List.of(1L, 2L))).thenReturn(List.of(first, second));

        tagService.reorderTags(List.of(1L, 2L));

        verify(tagMapper).updateSortOrder(1L, 20L);
        verify(tagMapper).updateSortOrder(2L, 10L);
    }

    private Tag tag(Long id, String name) {
        Tag tag = new Tag();
        tag.setId(id);
        tag.setName(name);
        return tag;
    }
}
