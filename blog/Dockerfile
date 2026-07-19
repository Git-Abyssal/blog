# Multi-stage Dockerfile for optimized image size
# Stage 1: Build stage with full JDK
FROM maven:3.9-eclipse-temurin-17@sha256:1ed5d1f54416b706707b4f3238f63a20bb06aab27c6d240090a2bb9ad895ed45 AS builder

WORKDIR /build

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage with minimal JRE
FROM eclipse-temurin:17-jre-alpine@sha256:02320dd4ce20e243dfb915c686089cf9315c763084fafbb12d5c9993aee18b57

# Install Alpine security updates, then create the non-root application user.
RUN apk upgrade --no-cache \
    && addgroup -S bloggroup \
    && adduser -S bloguser -G bloggroup

WORKDIR /app

# Copy only the JAR file from builder stage
COPY --from=builder /build/target/*.jar app.jar

# Prepare the persistent log directory before dropping privileges. An empty
# named volume inherits this directory ownership on first mount.
RUN mkdir -p logs uploads && chown bloguser:bloggroup app.jar logs uploads

# Switch to non-root user
USER bloguser

EXPOSE 8080

# Application health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
