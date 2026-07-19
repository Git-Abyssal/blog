# Single Author Blog

一个面向个人写作的前后端分离博客。系统只有一个站长账号：站长负责写作和内容管理，访客无需账号即可阅读文章和提交评论。

## 功能

- 文章写作、草稿、发布、搜索、分类、标签和热榜
- Markdown、代码高亮、图片上传和本地草稿恢复
- 访客评论与站长审核、回复、删除
- 响应式页面、深色模式、SEO、站点地图和 Atom 订阅
- HttpOnly Cookie 鉴权、首次登录改密、单点登录、限流和审计日志
- MySQL 数据持久化、Redis 会话与缓存、Docker Compose 部署

## 技术栈

- 后端：Java 17、Spring Boot、Spring Security、MyBatis-Plus、Flyway
- 前端：Node.js 20+、React、TypeScript、Vite、Tailwind CSS
- 基础设施：MySQL 8、Redis 7、Nginx、Caddy

## 项目结构

```text
blog/                 Spring Boot 后端
blog-web/apps/site/   公开博客
blog-web/apps/admin/  站长后台
blog-web/packages/    前端共享代码
mysql/                MySQL 运行镜像
caddy/                HTTPS 入口镜像
compose.yaml          生产部署编排
```

## 本地开发

需要 Java 17、Node.js 20 或更高版本、MySQL 8 和 Redis 7。

先创建数据库并启动后端：

```bash
cd blog

DB_PASSWORD=你的本地数据库密码 \
BLOG_OWNER_INITIAL_PASSWORD=至少8位的初始密码 \
mvn spring-boot:run
```

默认数据库连接为 `root@localhost:3306/blog_db`。可以通过 `SPRING_DATASOURCE_URL`、`DB_USERNAME` 和 `DB_PASSWORD` 覆盖。

首次启动会创建站长账号和默认分类。站长用户名默认为 `admin`，可通过 `BLOG_OWNER_USERNAME` 修改；首次登录必须修改初始密码。

启动前端：

```bash
cd blog-web
npm ci
npm run dev:site
npm run dev:admin
```

- 公开博客：`http://localhost:5173`
- 站长后台：`http://localhost:5174/admin/`
- 开发环境 API 文档：`http://localhost:8080/swagger-ui/index.html`

两套前端开发服务会把 `/api`、`/rss`、`/sitemap.xml` 和 `/robots.txt` 代理到 `http://localhost:8080`。

## 验证

```bash
cd blog
mvn test

cd ../blog-web
npm run test:run
npm run lint
npm run typecheck
npm run build
```

## 生产部署

1. 复制环境变量模板并填写真实值：

   ```bash
   cp .env.example .env
   ```

2. 生成 JWT 密钥：

   ```bash
   openssl rand -base64 64
   ```

3. 配置正式域名、数据库密码、Redis 密码和站长初始密码。

4. 启动：

   ```bash
   docker compose up -d --build
   ```

Caddy 负责 HTTPS 证书和公网入口。MySQL、Redis、上传文件、日志和证书数据都保存在 Docker volume 中。

## 主要配置

| 环境变量 | 用途 |
| --- | --- |
| `BLOG_OWNER_USERNAME` | 唯一站长账号名 |
| `BLOG_OWNER_INITIAL_PASSWORD` | 首次创建站长账号时使用的密码 |
| `BLOG_SITE_TITLE` | 站点、后台和 Atom 订阅源显示的名称 |
| `BLOG_AUTHOR_NAME` | SEO 和 Atom 订阅源显示的作者名 |
| `BLOG_SITE_DESCRIPTION` | 公开站点的简介和 SEO 描述 |
| `JWT_SECRET` | Base64 编码的 JWT 密钥 |
| `APP_BASE_URL` | 公开站点地址 |
| `SITE_ADDRESS` | Caddy 使用的域名或公网 IP |
| `CORS_ORIGIN_PATTERNS` | 允许访问后端的前端来源 |
| `SECURITY_TRUSTED_PROXIES` | 可以提供真实访客 IP 的代理地址 |
| `STORAGE_BUCKET` | 上传图片目录名 |
| `STORAGE_PUBLIC_URL` | 上传文件公开访问前缀 |

完整模板见 [.env.example](.env.example)。

## 自定义站点

站点名称、作者名和简介通过 `.env` 配置。默认值位于 `blog-web/site.defaults.ts`，图标和 Logo 位于 `blog-web/public/`。

## 许可证

源代码使用 [MIT License](LICENSE)。

`Abyssal` 名称以及 `blog-web/public/` 中的 Logo、图标不属于 MIT 授权范围。部署自己的站点时，请替换这些品牌内容。
