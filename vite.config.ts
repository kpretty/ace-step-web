import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy all API calls to the backend so they are same-origin.
      // The target is the default backend URL; users can change it via
      // the API settings UI but the proxy always points here in dev.
      '/v1': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/release_task': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/query_result': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/format_input': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
