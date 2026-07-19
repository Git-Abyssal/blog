package com.example.blog.security;

import com.example.blog.dto.ApiResponse;
import com.example.blog.entity.Owner;
import com.example.blog.mapper.OwnerMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

/**
 * 首次登录强制修改密码：未修改密码时仅允许访问登录、登出、修改密码等端点。
 */
@Component
@Profile("!test")
public class FirstLoginPasswordChangeFilter implements Filter {

    @Autowired
    private OwnerMapper ownerMapper;

    private static final List<String> ALLOWED_PATHS = List.of(
            "/api/auth/login", "/api/auth/logout", "/api/auth/change-password", "/api/auth/me",
            "/health", "/swagger-ui", "/v3/api-docs"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String path = httpRequest.getRequestURI();
        if (ALLOWED_PATHS.stream().anyMatch(path::startsWith)) {
            chain.doFilter(request, response);
            return;
        }
        if (SecurityContextHolder.getContext().getAuthentication() != null
                && SecurityContextHolder.getContext().getAuthentication().isAuthenticated()
                && SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof UserDetails) {
            String username = ((UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUsername();
            Owner owner = ownerMapper.selectById(1L);
            if (owner != null && username.equals(owner.getUsername())
                    && Boolean.FALSE.equals(owner.getPasswordChanged())) {
                httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                httpResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
                httpResponse.setCharacterEncoding("UTF-8");
                new ObjectMapper().writeValue(httpResponse.getWriter(), ApiResponse.error(403, "您首次登录，请修改密码后继续使用"));
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
