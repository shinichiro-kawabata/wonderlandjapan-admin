
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // 這一行是絕對成功的關鍵：將 Vercel 的環境變數對應到前端代碼
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
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
