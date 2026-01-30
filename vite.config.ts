
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // 確保這裡的定義是靜態字串注入
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  server: {
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext'
  }
})
