package com.example.blog.controller;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.example.blog.audit.AuditLogService;
import com.example.blog.dto.LoginRequest;
import com.example.blog.dto.LoginResponse;
import com.example.blog.dto.ApiResponse;
import com.example.blog.dto.OwnerInfoResponse;
import com.example.blog.entity.Owner;
import com.example.blog.mapper.PasswordHistoryMapper;
import com.example.blog.mapper.OwnerMapper;
import com.example.blog.security.JwtTokenProvider;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private OwnerMapper ownerMapper;
    @Mock
    private PasswordHistoryMapper passwordHistoryMapper;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private AuditLogService auditLogService;
    @InjectMocks
    private AuthController authController;

    @BeforeAll
    static void initMybatisPlusTableInfo() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant = new MapperBuilderAssistant(configuration, "");
        TableInfoHelper.initTableInfo(assistant, Owner.class);
    }

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authController, "ownerUsername", " owner ");
        ReflectionTestUtils.setField(authController, "jwtExpirationMs", 86_400_000L);
        ReflectionTestUtils.setField(authController, "cookieSecure", false);
        ReflectionTestUtils.setField(authController, "cookieSameSite", "Lax");
        ReflectionTestUtils.setField(authController, "trustedProxiesConfig", "127.0.0.1,::1");
    }

    @Test
    void rejectsLoginForAnyUsernameOtherThanOwner() {
        var result = authController.login(
                new LoginRequest("visitor", "Password123!"),
                new MockHttpServletRequest(),
                new MockHttpServletResponse());

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(ownerMapper, authenticationManager);
        verify(auditLogService).recordLoginAttempt(eq("visitor"), any(), eq(false), eq("Invalid username or password"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void allowsConfiguredOwnerToLogin() {
        Owner owner = owner();
        owner.setId(1L);
        owner.setPasswordChanged(false);
        when(ownerMapper.selectById(1L)).thenReturn(owner);
        when(authenticationManager.authenticate(any())).thenReturn(mock(Authentication.class));

        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername("owner")
                .password("encoded")
                .roles("OWNER")
                .build();
        when(userDetailsService.loadUserByUsername("owner")).thenReturn(details);
        when(jwtTokenProvider.generateToken(eq(details), anyString())).thenReturn("signed-jwt");

        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        MockHttpServletResponse response = new MockHttpServletResponse();

        var result = authController.login(
                new LoginRequest("owner", "Password123!"),
                new MockHttpServletRequest(),
                response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        LoginResponse body = (LoginResponse) result.getBody();
        assertNotNull(body);
        assertTrue(body.getOwner().isMustChangePassword());
        assertNotNull(response.getCookie("jwt"));
        assertEquals("signed-jwt", response.getCookie("jwt").getValue());
        verify(valueOperations).set(eq("sso:owner"), anyString(), eq(86_400_000L), eq(TimeUnit.MILLISECONDS));
    }

    @Test
    void anonymousAuthenticationProbeReturnsUnauthorized() {
        Authentication anonymous = mock(Authentication.class);
        when(anonymous.isAuthenticated()).thenReturn(true);
        when(anonymous.getPrincipal()).thenReturn("anonymousUser");

        var result = authController.getCurrentOwner(anonymous);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(ownerMapper);
    }

    @Test
    void currentOwnerResponseIncludesPasswordChangeRequirement() {
        Owner owner = owner();
        owner.setPasswordChanged(false);
        when(ownerMapper.selectById(1L)).thenReturn(owner);
        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername("owner")
                .password("encoded")
                .roles("OWNER")
                .build();
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(details);

        var result = authController.getCurrentOwner(authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        OwnerInfoResponse body = (OwnerInfoResponse) result.getBody();
        assertNotNull(body);
        assertTrue(body.isMustChangePassword());
    }

    @Test
    void badPasswordDoesNotPersistGlobalAccountLock() {
        Owner owner = owner();
        when(ownerMapper.selectById(1L)).thenReturn(owner);
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad credentials"));

        var result = authController.login(
                new LoginRequest("owner", "wrong-password"),
                new MockHttpServletRequest(),
                new MockHttpServletResponse());

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        ApiResponse<?> body = (ApiResponse<?>) result.getBody();
        assertNotNull(body);
        assertEquals("用户名或密码错误", body.getMessage());
        verify(ownerMapper, never()).updateById(any(Owner.class));
    }

    private Owner owner() {
        Owner owner = new Owner();
        owner.setUsername("owner");
        owner.setPassword("encoded");
        return owner;
    }
}
