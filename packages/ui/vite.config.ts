import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // VITE_API_URL es el backend al que el proxy de Vite reenvia en desarrollo.
  // Solo se REQUIERE en modo dev (`command === 'serve'`): ahi el proxy lo usa.
  // En `build` (produccion) el frontend se compila a estaticos y nginx proxya
  // /api al backend (ver packages/ui/Dockerfile), asi que no hace falta.
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL
  if (command === 'serve' && !apiUrl) {
    throw new Error(
      'VITE_API_URL es requerido en desarrollo. Definelo en packages/ui/.env (ver .env.example).',
    )
  }

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
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
