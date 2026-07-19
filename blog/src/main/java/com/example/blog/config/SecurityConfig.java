package com.example.blog.config;

import com.example.blog.security.RestApiCsrfFilter;
import com.example.blog.security.FirstLoginPasswordChangeFilter;
import com.example.blog.security.JwtAuthenticationFilter;
import com.example.blog.security.RateLimitFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;
import org.springframework.security.web.util.matcher.RegexRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("!test")  // 测试时使用 TestSecurityConfig，不加载本配置及 JwtAuthenticationFilter 等依赖
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private RateLimitFilter rateLimitFilter;

    @Autowired
    private FirstLoginPasswordChangeFilter firstLoginPasswordChangeFilter;

    @Autowired
    private RestApiCsrfFilter restApiCsrfFilter;

    /** 允许的 CORS 源，逗号分隔；生产环境必须明确设置，不要使用通配符 */
    @Value("${cors.allowed-origin-patterns:}")
    private String allowedOriginPatternsConfig;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        boolean isDevelopment = !"prod".equals(activeProfile);

        http
            // Disable Spring's session-based CSRF (not applicable for stateless JWT).
            // Custom RestApiCsrfFilter provides Origin/Referer-based CSRF protection for the REST API.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health", "/health/liveness", "/health/readiness").permitAll()
                .requestMatchers("/", "/index.html", "/static/**", "/assets/**", "/*.js", "/*.css", "/*.png", "/*.svg", "/*.ico").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/me").permitAll()
                .requestMatchers(HttpMethod.GET, "/rss/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/sitemap.xml", "/robots.txt").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/articles", "/api/articles/").permitAll()
                .requestMatchers(new RegexRequestMatcher("^/api/articles/\\d+(?:/related)?/?$", "GET")).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories", "/api/categories/", "/api/tags", "/api/tags/").permitAll()
                .requestMatchers(new RegexRequestMatcher("^/api/comments/article/\\d+/threaded/?(?:\\?.*)?$", "GET")).permitAll()
                .requestMatchers(new RegexRequestMatcher("^/api/comments/article/\\d+/?$", "POST")).permitAll()
                // Swagger 仅在开发环境可用
                .requestMatchers("/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/swagger-ui.html").access((authentication, context) ->
                                    new org.springframework.security.authorization.AuthorizationDecision(isDevelopment))
                // 所有管理与写入接口只允许站长访问。
                .requestMatchers("/api/admin/**", "/api/upload/**").hasRole("OWNER")
                .requestMatchers(HttpMethod.POST, "/api/articles/**", "/api/categories/**", "/api/tags/**", "/api/comments/**").hasRole("OWNER")
                .requestMatchers(HttpMethod.PUT, "/api/**").hasRole("OWNER")
                .requestMatchers(HttpMethod.PATCH, "/api/**").hasRole("OWNER")
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("OWNER")
                .anyRequest().hasRole("OWNER")
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class)
            .addFilterAfter(firstLoginPasswordChangeFilter, JwtAuthenticationFilter.class)
            .addFilterBefore(restApiCsrfFilter, FirstLoginPasswordChangeFilter.class)
            .headers(headers -> headers
                .addHeaderWriter(new StaticHeadersWriter(
                    "Permissions-Policy",
                    "geolocation=(), microphone=(), camera=()"))
                // 防止点击劫持攻击
                .frameOptions(frame -> frame.deny())
                // XSS保护
                .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                // HTTP严格传输安全（仅在生产环境启用）
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                // 内容安全策略
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; " +
                                   "script-src 'self'; " +
                                   "style-src 'self' 'unsafe-inline'; " +
                                   "img-src 'self' data: https:; " +
                                   "font-src 'self' data:; " +
                                   "connect-src 'self'; " +
                                   "frame-ancestors 'none'; " +
                                   "base-uri 'self'; " +
                                   "form-action 'self'"))
                // X-Content-Type-Options: nosniff is enabled by default in Spring Security
                // 设置referrer策略
                .referrerPolicy(referrer -> referrer
                    .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
            );
        
        return http.build();
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> patterns = Arrays.stream(allowedOriginPatternsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        boolean isProduction = "prod".equals(activeProfile);

        // Validate CORS configuration
        if (patterns.isEmpty()) {
            if (isProduction) {
                logger.error("========================================");
                logger.error("SECURITY ALERT: Production CORS configuration is empty!");
                logger.error("All cross-origin requests will be DENIED.");
                logger.error("Set environment variable CORS_ORIGIN_PATTERNS");
                logger.error("Example: CORS_ORIGIN_PATTERNS=https://yourblog.com,https://www.yourblog.com");
                logger.error("========================================");
            } else {
                // Development: Require explicit configuration for better security practices
                logger.warn("========================================");
                logger.warn("CORS configuration is empty!");
                logger.warn("Set CORS_ORIGIN_PATTERNS environment variable.");
                logger.warn("Example: CORS_ORIGIN_PATTERNS=http://localhost:5173,http://localhost:5174");
                logger.warn("For development only, you can use: CORS_ORIGIN_PATTERNS=http://localhost:*");
                logger.warn("========================================");
            }
            // Empty list denies all cross-origin requests (secure by default)
            configuration.setAllowedOriginPatterns(Collections.emptyList());
        } else {
            // Validate patterns don't contain wildcard in production
            if (isProduction && patterns.contains("*")) {
                logger.error("========================================");
                logger.error("SECURITY ALERT: Wildcard (*) CORS origin detected in production!");
                logger.error("This is a security risk. Please use specific origins.");
                logger.error("========================================");
                // Remove wildcard for security
                patterns.remove("*");
            }

            if (patterns.isEmpty()) {
                configuration.setAllowedOriginPatterns(Collections.emptyList());
            } else {
                configuration.setAllowedOriginPatterns(patterns);
                logger.info("CORS configured for origins: {}", patterns);
            }
        }

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Content-Type", "Cache-Control", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // Cache preflight requests for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // These filters run inside Spring Security. Disable a second servlet-container registration,
    // otherwise native Filter implementations would execute twice per request.
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(JwtAuthenticationFilter filter) {
        return securityOnlyFilter(filter);
    }

    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration(RateLimitFilter filter) {
        return securityOnlyFilter(filter);
    }

    @Bean
    public FilterRegistrationBean<FirstLoginPasswordChangeFilter> firstLoginFilterRegistration(
            FirstLoginPasswordChangeFilter filter) {
        return securityOnlyFilter(filter);
    }

    @Bean
    public FilterRegistrationBean<RestApiCsrfFilter> csrfFilterRegistration(RestApiCsrfFilter filter) {
        return securityOnlyFilter(filter);
    }

    private static <T extends jakarta.servlet.Filter> FilterRegistrationBean<T> securityOnlyFilter(T filter) {
        FilterRegistrationBean<T> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
