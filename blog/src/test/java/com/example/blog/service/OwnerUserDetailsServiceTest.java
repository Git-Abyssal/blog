package com.example.blog.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.example.blog.entity.Owner;
import com.example.blog.mapper.OwnerMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OwnerUserDetailsServiceTest {

    @Mock
    private OwnerMapper ownerMapper;

    @InjectMocks
    private OwnerUserDetailsService userDetailsService;

    @BeforeAll
    static void initMybatisPlusTableInfo() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant = new MapperBuilderAssistant(configuration, "");
        TableInfoHelper.initTableInfo(assistant, Owner.class);
    }

    @BeforeEach
    void configureOwner() {
        ReflectionTestUtils.setField(userDetailsService, "ownerUsername", " owner ");
    }

    @Test
    void rejectsAnyUsernameOtherThanConfiguredOwner() {
        assertThrows(UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("other-user"));

        verifyNoInteractions(ownerMapper);
    }

    @Test
    void loadsConfiguredOwnerWithOwnerAuthority() {
        Owner owner = owner();
        when(ownerMapper.selectById(1L)).thenReturn(owner);

        var details = userDetailsService.loadUserByUsername("owner");

        assertEquals("owner", details.getUsername());
        assertTrue(details.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_OWNER".equals(authority.getAuthority())));
    }

    private Owner owner() {
        Owner owner = new Owner();
        owner.setUsername("owner");
        owner.setPassword("encoded-password");
        return owner;
    }
}
