# 构建阶段
FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS build-stage
WORKDIR /app
ARG BLOG_SITE_TITLE=Abyssal的分享
ARG BLOG_AUTHOR_NAME=Abyssal
ARG BLOG_SITE_DESCRIPTION=一个面向个人写作的单作者博客
ENV BLOG_SITE_TITLE=$BLOG_SITE_TITLE
ENV BLOG_AUTHOR_NAME=$BLOG_AUTHOR_NAME
ENV BLOG_SITE_DESCRIPTION=$BLOG_SITE_DESCRIPTION
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段：使用官方无特权镜像，Nginx 全程以非 root 用户运行。
FROM nginxinc/nginx-unprivileged:1.30.4-alpine@sha256:dcea25a6593307a74b09e59a47f8695c4d56943750e45add532ae0bf8b24bfd6
COPY --from=build-stage /app/dist/site /usr/share/nginx/html/site
COPY --from=build-stage /app/dist/admin /usr/share/nginx/html/admin
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
