import { defineConfig } from 'vite'
import { createViteConfig } from './vite.shared'

export default defineConfig(({ mode }) => createViteConfig('admin', mode))
