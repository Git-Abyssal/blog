package com.example.blog.security;

import com.example.blog.entity.Owner;
import com.example.blog.mapper.OwnerMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FirstLoginPasswordChangeFilterTest {

    @Mock
    private OwnerMapper ownerMapper;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private FirstLoginPasswordChangeFilter filter;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void allowsCurrentUserProbeBeforeInitialPasswordChange() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/me");
        MockHttpServletResponse response = new MockHttpServletResponse();
        UserDetails owner = org.springframework.security.core.userdetails.User
                .withUsername("owner")
                .password("encoded")
                .roles("OWNER")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(owner, null, owner.getAuthorities()));

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(ownerMapper);
    }

    @Test
    void blocksRegularApiCallsBeforeInitialPasswordChange() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/articles");
        MockHttpServletResponse response = new MockHttpServletResponse();
        UserDetails owner = org.springframework.security.core.userdetails.User
                .withUsername("owner")
                .password("encoded")
                .roles("OWNER")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(owner, null, owner.getAuthorities()));
        Owner ownerAccount = new Owner();
        ownerAccount.setUsername("owner");
        ownerAccount.setPasswordChanged(false);
        when(ownerMapper.selectById(1L)).thenReturn(ownerAccount);

        filter.doFilter(request, response, filterChain);

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("首次登录"));
        verifyNoInteractions(filterChain);
    }
}
