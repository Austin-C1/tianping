import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

export default ({ mode }: { mode: string }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const { VITE_PORT, VITE_BASE_URL, VITE_API_PROXY_URL } = env

  return defineConfig({
    base: VITE_BASE_URL || '/',
    server: {
      port: Number(VITE_PORT || 3001),
      proxy: {
        '/api': {
          target: VITE_API_PROXY_URL || 'http://localhost:4000',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api/, '')
        }
      },
      host: true
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@views': resolvePath('src/views')
      }
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      chunkSizeWarningLimit: 2000
    },
    plugins: [vue()]
  })
}

function resolvePath(paths: string) {
  return path.resolve(__dirname, paths)
}
