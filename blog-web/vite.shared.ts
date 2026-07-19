import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin, type UserConfig } from 'vite'
import { siteDefaults } from './site.defaults'

const aliases = {
  '@site': resolve(__dirname, 'apps/site/src'),
  '@admin': resolve(__dirname, 'apps/admin/src'),
  '@shared': resolve(__dirname, 'packages/shared/src'),
}

const proxy = {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/rss': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/sitemap.xml': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/robots.txt': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
}

const escapeHtml = (value: string) => value.replace(
  /[&<>"']/g,
  (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character,
)

const siteMetadataPlugin = (title: string, description: string): Plugin => ({
  name: 'site-metadata',
  transformIndexHtml(html) {
    return html
      .replaceAll('__BLOG_SITE_TITLE__', escapeHtml(title))
      .replaceAll('__BLOG_SITE_DESCRIPTION__', escapeHtml(description))
  },
})

export const createViteConfig = (
  app: 'site' | 'admin',
  mode = 'development',
): UserConfig => {
  const env = loadEnv(mode, resolve(__dirname, '..'), 'BLOG_')
  const configuredValue = (name: string, fallback: string) =>
    process.env[name]?.trim() || env[name]?.trim() || fallback
  const title = configuredValue('BLOG_SITE_TITLE', siteDefaults.title)
  const authorName = configuredValue('BLOG_AUTHOR_NAME', siteDefaults.authorName)
  const description = configuredValue('BLOG_SITE_DESCRIPTION', siteDefaults.description)

  return {
    root: resolve(__dirname, `apps/${app}`),
    base: app === 'admin' ? '/admin/' : '/',
    cacheDir: resolve(__dirname, `node_modules/.vite/${app}`),
    publicDir: resolve(__dirname, 'public'),
    plugins: [react(), siteMetadataPlugin(title, description)],
    define: {
      'import.meta.env.VITE_SITE_TITLE': JSON.stringify(title),
      'import.meta.env.VITE_AUTHOR_NAME': JSON.stringify(authorName),
      'import.meta.env.VITE_SITE_DESCRIPTION': JSON.stringify(description),
    },
    resolve: {
      alias: aliases,
    },
    build: {
      outDir: resolve(__dirname, `dist/${app}`),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query', 'axios'],
            markdown: ['react-markdown', 'remark-gfm'],
            highlight: ['react-syntax-highlighter'],
            motion: ['framer-motion'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      port: app === 'admin' ? 5174 : 5173,
      proxy,
    },
  }
}
