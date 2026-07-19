package com.example.blog.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void anonymousGuestCommentsUseClientIpRateLimitBucket() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        ReflectionTestUtils.setField(filter, "redisTemplate", redisTemplate);
        ReflectionTestUtils.setField(filter, "maxCommentRequests", 1);
        ReflectionTestUtils.setField(filter, "trustedProxiesConfig", "127.0.0.1,::1");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("rate_limit:ip:203.0.113.8:comment_create"))
                .thenReturn(1L, 2L);

        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        filter.doFilter(guestCommentRequest(), firstResponse, new MockFilterChain());
        assertEquals(200, firstResponse.getStatus());

        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        filter.doFilter(guestCommentRequest(), secondResponse, new MockFilterChain());
        assertEquals(429, secondResponse.getStatus());
        assertEquals("60", secondResponse.getHeader("Retry-After"));
    }

    @Test
    void eleventhLoginAttemptFromTheSameIpIsRateLimited() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        ReflectionTestUtils.setField(filter, "redisTemplate", redisTemplate);
        ReflectionTestUtils.setField(filter, "maxAuthRequests", 10);
        ReflectionTestUtils.setField(filter, "trustedProxiesConfig", "127.0.0.1,::1");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("rate_limit:ip:198.51.100.9:/api/auth/login"))
                .thenReturn(10L, 11L);

        MockHttpServletResponse tenthResponse = new MockHttpServletResponse();
        filter.doFilter(loginRequest(), tenthResponse, new MockFilterChain());
        assertEquals(200, tenthResponse.getStatus());

        MockHttpServletResponse eleventhResponse = new MockHttpServletResponse();
        filter.doFilter(loginRequest(), eleventhResponse, new MockFilterChain());
        assertEquals(429, eleventhResponse.getStatus());
        assertEquals("60", eleventhResponse.getHeader("Retry-After"));
    }

    @Test
    void ownerArticleCreationUsesOwnerRateLimitBucket() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        ReflectionTestUtils.setField(filter, "redisTemplate", redisTemplate);
        ReflectionTestUtils.setField(filter, "maxArticleRequests", 1);
        ReflectionTestUtils.setField(filter, "trustedProxiesConfig", "127.0.0.1,::1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("owner", null, List.of()));
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("rate_limit:owner:owner:article_create"))
                .thenReturn(1L, 2L);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/articles");
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        filter.doFilter(request, firstResponse, new MockFilterChain());
        assertEquals(200, firstResponse.getStatus());

        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        filter.doFilter(request, secondResponse, new MockFilterChain());
        assertEquals(429, secondResponse.getStatus());
    }

    private MockHttpServletRequest guestCommentRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/comments/article/1");
        request.setRemoteAddr("203.0.113.8");
        return request;
    }

    private MockHttpServletRequest loginRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr("198.51.100.9");
        return request;
    }
}
