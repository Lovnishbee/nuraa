import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-dom') || id.includes('react')) return 'react'
          if (id.includes('@tanstack/react-query')) return 'query'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('lucide-react')) return 'icons'
          return 'vendor'
        },
      },
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
})
