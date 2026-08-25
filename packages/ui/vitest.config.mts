import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Config de test independiente de vite.config.ts: esa exige VITE_API_URL (proxy
// de dev) y no queremos ese requisito para correr la suite. Aqui solo montamos
// el entorno jsdom + React para los tests de UI.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
