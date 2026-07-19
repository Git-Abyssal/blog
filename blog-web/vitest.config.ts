import { defineConfig, mergeConfig } from 'vitest/config'
import { createViteConfig } from './vite.shared'

export default mergeConfig(
  createViteConfig('site', 'test'),
  defineConfig({
    root: __dirname,
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
    },
  }),
)
