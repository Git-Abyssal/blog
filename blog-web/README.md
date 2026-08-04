# 单作者博客前端

前端由公开博客和站长后台两个 Vite 应用组成，共用类型、鉴权、请求和基础组件：

```text
apps/
├── site/       公开文章站点
└── admin/      后台管理
packages/
└── shared/     两个应用共用的代码
tests/
├── site/
├── admin/
└── shared/
```

## 本地开发

需要 Node.js 24 或更高版本。

```bash
npm ci
npm run dev:site    # http://localhost:5173
npm run dev:admin   # http://localhost:5174/admin/
```

两套开发服务都会把 `/api` 代理到 `http://localhost:8080`。

站点名称、作者名和简介从项目根目录的 `.env` 读取，对应
`BLOG_SITE_TITLE`、`BLOG_AUTHOR_NAME` 和 `BLOG_SITE_DESCRIPTION`。未配置时使用
`site.defaults.ts` 中的默认值。

## 验证和构建

```bash
npm run test:run
npm run lint
npm run build
```

生产构建分别输出到：

- `dist/site`：公开站点。
- `dist/admin`：后台应用，资源基础路径为 `/admin/`。

生产环境由同一个 Nginx 在同一域名下提供两套应用，后台入口为 `/admin/login`。
