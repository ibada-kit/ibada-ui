import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'https://mlcharitywebapi-g6evcsavaqf6drej.centralindia-01.azurewebsites.net',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
