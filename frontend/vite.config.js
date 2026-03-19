import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Avoid `import.meta.env` so Jest can parse this file.
    __VITE_API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || ''),
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    }
  },
  build: { outDir: 'dist' }
})
