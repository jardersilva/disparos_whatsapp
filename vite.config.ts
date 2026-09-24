import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    server: {
      // Mesmo proxy do nginx em produção: a API key é injetada aqui e não vai para o bundle.
      proxy: env.EVOLUTION_API_URL
        ? {
            '/evolution': {
              target: env.EVOLUTION_API_URL,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/evolution/, ''),
              headers: { apikey: env.EVOLUTION_API_KEY ?? '' },
            },
          }
        : undefined,
    },
  }
})
