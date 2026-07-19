package com.example.blog.config;

import com.example.blog.entity.Owner;
import com.example.blog.mapper.CategoryMapper;
import com.example.blog.mapper.OwnerMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OwnerDataInitializerTest {

    @Mock
    private OwnerMapper ownerMapper;
    @Mock
    private CategoryMapper categoryMapper;
    @Mock
    private PasswordEncoder passwordEncoder;

    private OwnerDataInitializer initializer;

    @BeforeEach
    void setUp() {
        initializer = new OwnerDataInitializer();
        ReflectionTestUtils.setField(initializer, "ownerUsername", " site-owner ");
        ReflectionTestUtils.setField(initializer, "ownerInitialPassword", "StrongPassword123!");
    }

    @Test
    void createsConfiguredOwner() throws Exception {
        when(ownerMapper.selectById(1L)).thenReturn(null);
        when(passwordEncoder.encode("StrongPassword123!")).thenReturn("encoded");
        when(categoryMapper.selectCount(null)).thenReturn(1L);

        initializer.initData(ownerMapper, categoryMapper, passwordEncoder).run();

        ArgumentCaptor<Owner> captor = ArgumentCaptor.forClass(Owner.class);
        verify(ownerMapper).insert(captor.capture());
        Owner created = captor.getValue();
        assertEquals(1L, created.getId());
        assertEquals("site-owner", created.getUsername());
        assertEquals("encoded", created.getPassword());
        assertFalse(created.getPasswordChanged());
    }

    @Test
    void existingOwnerDoesNotNeedBootstrapPassword() throws Exception {
        Owner existing = new Owner();
        existing.setUsername("site-owner");
        when(ownerMapper.selectById(1L)).thenReturn(existing);
        when(categoryMapper.selectCount(null)).thenReturn(1L);
        ReflectionTestUtils.setField(initializer, "ownerInitialPassword", "");

        initializer.initData(ownerMapper, categoryMapper, passwordEncoder).run();

        verify(ownerMapper, never()).insert(any(Owner.class));
    }

    @Test
    void requiresBootstrapPasswordOnlyWhenOwnerIsMissing() {
        when(ownerMapper.selectById(1L)).thenReturn(null);
        ReflectionTestUtils.setField(initializer, "ownerInitialPassword", "");

        assertThrows(RuntimeException.class,
                () -> initializer.initData(ownerMapper, categoryMapper, passwordEncoder).run());
    }
}
