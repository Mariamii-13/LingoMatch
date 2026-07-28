import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/lib/ai/**/*.test.ts',
      'src/lib/validations/**/*.test.ts',
      'src/lib/language-profile.test.ts',
      'src/lib/onboarding-access.test.ts',
      'src/app/**/*.test.tsx',
    ],
    pool: 'threads',
    maxWorkers: 2,
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './src/test/server-only-mock.ts'),
    },
  },
})
