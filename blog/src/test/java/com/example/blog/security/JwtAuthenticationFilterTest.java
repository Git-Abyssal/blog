package com.example.blog.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter();
        ReflectionTestUtils.setField(filter, "userDetailsService", userDetailsService);
        ReflectionTestUtils.setField(filter, "jwtTokenProvider", jwtTokenProvider);
        ReflectionTestUtils.setField(filter, "redisTemplate", redisTemplate);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void tokenForAnotherUsernameFallsBackToAnonymous() throws Exception {
        when(jwtTokenProvider.extractUsername("other-token")).thenReturn("other-user");
        when(userDetailsService.loadUserByUsername("other-user"))
                .thenThrow(new UsernameNotFoundException("User not found"));

        MockHttpServletRequest request = requestWithCookie("other-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(chain.getRequest());
    }

    @Test
    void authorizationHeaderIsIgnored() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/articles");
        request.addHeader("Authorization", "Bearer header-token");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(chain.getRequest());
        verifyNoInteractions(jwtTokenProvider, userDetailsService, redisTemplate);
    }

    @Test
    void acceptedOwnerTokenCreatesAdminAuthentication() throws Exception {
        UserDetails owner = org.springframework.security.core.userdetails.User
                .withUsername("owner")
                .password("encoded")
                .roles("OWNER")
                .build();
        when(jwtTokenProvider.extractUsername("owner-token")).thenReturn("owner");
        when(userDetailsService.loadUserByUsername("owner")).thenReturn(owner);
        when(jwtTokenProvider.validateToken("owner-token", owner)).thenReturn(true);
        when(jwtTokenProvider.extractSid("owner-token")).thenReturn("current-sid");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("sso:owner")).thenReturn("current-sid");

        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(requestWithCookie("owner-token"), new MockHttpServletResponse(), chain);

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertEquals("owner", authentication.getName());
        assertEquals("ROLE_OWNER", authentication.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void tokenWithoutSessionIdIsRejected() throws Exception {
        UserDetails owner = org.springframework.security.core.userdetails.User
                .withUsername("owner")
                .password("encoded")
                .roles("OWNER")
                .build();
        when(jwtTokenProvider.extractUsername("owner-token-without-session")).thenReturn("owner");
        when(userDetailsService.loadUserByUsername("owner")).thenReturn(owner);
        when(jwtTokenProvider.validateToken("owner-token-without-session", owner)).thenReturn(true);
        when(jwtTokenProvider.extractSid("owner-token-without-session")).thenReturn(null);

        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(requestWithCookie("owner-token-without-session"), new MockHttpServletResponse(), chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(chain.getRequest());
    }

    @Test
    void tokenWithCurrentSessionIdIsAccepted() throws Exception {
        UserDetails owner = org.springframework.security.core.userdetails.User
                .withUsername("owner")
                .password("encoded")
                .roles("OWNER")
                .build();
        when(jwtTokenProvider.extractUsername("current-owner-token")).thenReturn("owner");
        when(userDetailsService.loadUserByUsername("owner")).thenReturn(owner);
        when(jwtTokenProvider.validateToken("current-owner-token", owner)).thenReturn(true);
        when(jwtTokenProvider.extractSid("current-owner-token")).thenReturn("current-sid");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("sso:owner")).thenReturn("current-sid");

        filter.doFilter(requestWithCookie("current-owner-token"), new MockHttpServletResponse(), new MockFilterChain());

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("owner", SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private MockHttpServletRequest requestWithCookie(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/articles");
        request.setCookies(new Cookie("jwt", token));
        return request;
    }
}
