package com.example.blog.controller;

import com.example.blog.dto.ApiResponse;
import com.example.blog.audit.AuditLogService;
import com.example.blog.dto.ChangePasswordRequest;
import com.example.blog.dto.LoginRequest;
import com.example.blog.dto.LoginResponse;
import com.example.blog.dto.OwnerInfoResponse;
import com.example.blog.entity.PasswordHistory;
import com.example.blog.entity.Owner;
import com.example.blog.mapper.PasswordHistoryMapper;
import com.example.blog.mapper.OwnerMapper;
import com.example.blog.security.JwtTokenProvider;
import com.example.blog.util.ClientIpResolver;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private OwnerMapper ownerMapper;

    @Autowired
    private PasswordHistoryMapper passwordHistoryMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private AuditLogService auditLogService;

    @Value("${blog.owner-username:admin}")
    private String ownerUsername;

    @Value("${jwt.expiration:86400000}")
    private Long jwtExpirationMs;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Strict}")
    private String cookieSameSite;

    @Value("${security.authentication.password-history-size:5}")
    private int passwordHistorySize;

    @Value("${security.trusted-proxies:127.0.0.1,::1}")
    private String trustedProxiesConfig;

    private static final String SSO_KEY_PREFIX = "sso:";
    private static final String JWT_COOKIE_NAME = "jwt";
    private static final int COOKIE_MAX_AGE_SECONDS = 86400; // 24 hours

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (!configuredOwnerUsername().equals(loginRequest.getUsername())) {
            return rejectInvalidLogin(loginRequest.getUsername(), request);
        }

        // 只允许配置的站长账号登录。
        Owner owner = ownerMapper.selectById(1L);
        if (owner == null || !loginRequest.getUsername().equals(owner.getUsername())) {
            return rejectInvalidLogin(loginRequest.getUsername(), request);
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );

            final UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.getUsername());
            String sessionId = java.util.UUID.randomUUID().toString();
            final String jwt = jwtTokenProvider.generateToken(userDetails, sessionId);

            // 单点登录：当前用户只保留此 session，旧设备 token 将失效
            String ssoKey = SSO_KEY_PREFIX + owner.getUsername();
            redisTemplate.opsForValue().set(ssoKey, sessionId, jwtExpirationMs, TimeUnit.MILLISECONDS);

            // 将 JWT 设置为 httpOnly cookie
            setJwtCookie(response, jwt);

            String clientIp = getClientIp(request);
            logger.info("Owner {} logged in successfully from {}", owner.getUsername(), clientIp);
            auditLogService.recordLoginAttempt(owner.getUsername(), request, true, null);

            return ResponseEntity.ok(new LoginResponse(toOwnerInfoResponse(owner)));
        } catch (BadCredentialsException e) {
            String clientIp = getClientIp(request);
            logger.warn("Owner {} login failed from {}", owner.getUsername(), clientIp);
            auditLogService.recordLoginAttempt(owner.getUsername(), request, false, "Invalid username or password");
            return ApiResponse.<Void>error(401, "用户名或密码错误").toResponseEntity();
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentOwner(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserDetails)) {
            return ApiResponse.<Void>error(401, "未认证").toResponseEntity();
        }

        String username = ((UserDetails) authentication.getPrincipal()).getUsername();

        Owner owner = ownerMapper.selectById(1L);

        if (owner == null || !username.equals(owner.getUsername())) {
            return ApiResponse.<Void>error(404, "站长账号不存在").toResponseEntity();
        }

        return ResponseEntity.ok(toOwnerInfoResponse(owner));
    }

    private OwnerInfoResponse toOwnerInfoResponse(Owner owner) {
        return new OwnerInfoResponse(
                owner.getId(),
                owner.getUsername(),
                Boolean.FALSE.equals(owner.getPasswordChanged())
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            org.springframework.security.core.Authentication authentication,
            HttpServletResponse response) {
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof UserDetails) {
            String username = ((UserDetails) authentication.getPrincipal()).getUsername();
            redisTemplate.delete(SSO_KEY_PREFIX + username);
            logger.info("Owner {} logged out", username);
        }

        // 清除 JWT cookie
        clearJwtCookie(response);

        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest,
            org.springframework.security.core.Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof UserDetails)) {
            return ApiResponse.<Void>error(401, "未认证").toResponseEntity();
        }

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String username = userDetails.getUsername();
        Owner owner = ownerMapper.selectById(1L);

        if (owner == null || !username.equals(owner.getUsername())) {
            return ApiResponse.<Void>error(404, "站长账号不存在").toResponseEntity();
        }

        // 验证当前密码
        if (!passwordEncoder.matches(request.getCurrentPassword(), owner.getPassword())) {
            logger.warn("Password change failed for owner {}: incorrect current password", username);
            return ApiResponse.<Void>error(400, "当前密码不正确").toResponseEntity();
        }

        // 检查新密码是否与当前密码相同
        if (passwordEncoder.matches(request.getNewPassword(), owner.getPassword())) {
            return ApiResponse.<Void>error(400, "新密码不能与当前密码相同").toResponseEntity();
        }

        // 检查新密码是否在密码历史中
        String newPasswordHash = passwordEncoder.encode(request.getNewPassword());
        List<PasswordHistory> history = passwordHistoryMapper.selectRecent(50);

        // 只检查最近的N条记录
        int checkLimit = Math.min(passwordHistorySize, history.size());
        for (int i = 0; i < checkLimit; i++) {
            if (passwordEncoder.matches(request.getNewPassword(), history.get(i).getPasswordHash())) {
                logger.warn("Password change failed for owner {}: password reuse detected (position {} in history)",
                    owner.getUsername(), i + 1);
                return ApiResponse.<Void>error(400, "不能重复使用最近 " + passwordHistorySize + " 次使用过的密码").toResponseEntity();
            }
        }

        // 保存旧密码到历史记录
        PasswordHistory oldPasswordHistory = new PasswordHistory();
        oldPasswordHistory.setPasswordHash(owner.getPassword());
        oldPasswordHistory.setChangedAt(LocalDateTime.now());
        passwordHistoryMapper.insert(oldPasswordHistory);

        // 清理过期的密码历史记录（只保留最近的N条）
        if (history.size() >= passwordHistorySize) {
            List<PasswordHistory> allHistory = passwordHistoryMapper.selectRecent(100);
            if (allHistory.size() > passwordHistorySize) {
                List<PasswordHistory> toDelete = allHistory.subList(passwordHistorySize, allHistory.size());
                for (PasswordHistory ph : toDelete) {
                    passwordHistoryMapper.deleteById(ph.getId());
                }
            }
        }

        owner.setPassword(newPasswordHash);
        owner.setPasswordChanged(true);
        ownerMapper.updateById(owner);

        String clientIp = getClientIp(httpRequest);
        logger.info("Owner {} changed password successfully from {}", owner.getUsername(), clientIp);

        return ResponseEntity.ok(ApiResponse.ok("密码修改成功"));
    }

    /**
     * 将 JWT 设置为 httpOnly cookie
     */
    private void setJwtCookie(HttpServletResponse response, String jwt) {
        Cookie cookie = new Cookie(JWT_COOKIE_NAME, jwt);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(COOKIE_MAX_AGE_SECONDS);
        cookie.setAttribute("SameSite", cookieSameSite);
        response.addCookie(cookie);
    }

    /**
     * 清除 JWT cookie
     */
    private void clearJwtCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(JWT_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0); // 立即过期
        cookie.setAttribute("SameSite", cookieSameSite);
        response.addCookie(cookie);
    }

    /**
     * 获取客户端 IP 地址
     * 支持代理和负载均衡器的X-Forwarded-For头
     */
    private String getClientIp(HttpServletRequest request) {
        return ClientIpResolver.resolve(request, trustedProxiesConfig);
    }

    private ResponseEntity<?> rejectInvalidLogin(String attemptedUsername, HttpServletRequest request) {
        logger.warn("Rejected login attempt for non-owner account: {}", attemptedUsername);
        auditLogService.recordLoginAttempt(attemptedUsername, request, false, "Invalid username or password");
        return ApiResponse.<Void>error(401, "用户名或密码错误").toResponseEntity();
    }

    private String configuredOwnerUsername() {
        return ownerUsername == null ? "" : ownerUsername.trim();
    }
}
