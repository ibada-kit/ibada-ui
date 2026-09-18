import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || 'https://mlcharitywebapi-g6evcsavaqf6drej.centralindia-01.azurewebsites.net'

  const azureApiKey =
    env.APIKEY ||
    env.API_KEY ||
    env.VITE_APIKEY ||
    env.VITE_API_KEY ||
    env.AZURE_API_KEY ||
    env.VITE_AZURE_API_KEY ||
    process.env.APIKEY ||
    process.env.API_KEY ||
    process.env.VITE_APIKEY ||
    process.env.VITE_API_KEY ||
    process.env.AZURE_API_KEY ||
    process.env.VITE_AZURE_API_KEY ||
    ''

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'API', 'AZURE_'],
    define: {
      'import.meta.env.APIKEY': JSON.stringify(azureApiKey),
      'import.meta.env.API_KEY': JSON.stringify(azureApiKey),
      'import.meta.env.VITE_APIKEY': JSON.stringify(azureApiKey),
      'import.meta.env.VITE_API_KEY': JSON.stringify(azureApiKey),
      'import.meta.env.AZURE_API_KEY': JSON.stringify(azureApiKey),
      'import.meta.env.VITE_AZURE_API_KEY': JSON.stringify(azureApiKey)
    },
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})

