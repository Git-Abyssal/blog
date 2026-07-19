package com.example.blog.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;

/**
 * 从 HttpOnly Cookie 解析 JWT 并写入 SecurityContext。
 */
@Component
@Profile("!test")
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String SSO_KEY_PREFIX = "sso:";
    private static final String JWT_COOKIE_NAME = "jwt";
    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String username = null;
        String jwt = getJwtFromCookie(request);
        if (jwt != null) {
            logger.debug("JWT found in cookie");
        }

        if (jwt != null) {
            try {
                username = jwtTokenProvider.extractUsername(jwt);
            } catch (Exception e) {
                logger.warn("Could not extract username from token: {}", e.getMessage());
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                if (!jwtTokenProvider.validateToken(jwt, userDetails)) {
                    logger.warn("Invalid token for user: {}", username);
                    chain.doFilter(request, response);
                    return;
                }

                String sid = jwtTokenProvider.extractSid(jwt);
                String currentSid = sid == null
                        ? null
                        : redisTemplate.opsForValue().get(SSO_KEY_PREFIX + username);
                if (sid == null || currentSid == null || !currentSid.equals(sid)) {
                    logger.warn("SSO check failed for user: {}", username);
                    chain.doFilter(request, response);
                    return;
                }

                UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                logger.debug("Owner {} authenticated successfully", username);
            } catch (AuthenticationException e) {
                // Tokens for accounts other than the configured owner are treated as anonymous.
                logger.warn("JWT user is not allowed to authenticate: {}", username);
            } catch (Exception e) {
                logger.warn("JWT authentication failed for user {}: {}", username, e.getMessage());
            }
        }

        chain.doFilter(request, response);
    }

    private String getJwtFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        return Arrays.stream(cookies)
                .filter(cookie -> JWT_COOKIE_NAME.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
