import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_API_URL vive en packages/ui/.env — es el backend al que el proxy de
  // Vite reenvia. Es REQUERIDO (sin fallback): sin el, el proxy no sabria a
  // donde apuntar y el frontend no podria hablar con el API.
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL
  if (!apiUrl) {
    throw new Error(
      'VITE_API_URL es requerido. Definelo en packages/ui/.env (ver .env.example).',
    )
  }

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    server: {
      // Proxy de las llamadas al backend para hablar con un unico origen en dev
      // (sin CORS). El backend ahora sirve sus rutas bajo /api, asi que se
      // reenvia tal cual: `/api/health` -> `${VITE_API_URL}/api/health`.
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
