import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Support multiple naming conventions for API base URL and backend URL
  const rawApiUrl =
    env.VITE_API_BASE_URL ||
    env.API_BASE_URL ||
    env.VITE_API_URL ||
    env.API_URL ||
    env.VITE_BACKEND_URL ||
    env.BACKEND_URL ||
    env.VITE_API_ENDPOINT ||
    env.API_ENDPOINT ||
    process.env.VITE_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.VITE_API_URL ||
    process.env.API_URL ||
    process.env.VITE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.VITE_API_ENDPOINT ||
    process.env.API_ENDPOINT ||
    ''

  const normalizedApiUrl = rawApiUrl
    ? (rawApiUrl.trim().replace(/\/+$/, '').endsWith('/api')
        ? rawApiUrl.trim().replace(/\/+$/, '')
        : `${rawApiUrl.trim().replace(/\/+$/, '')}/api`)
    : ''

  const backendTarget =
    rawApiUrl
      ? rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '')
      : (env.VITE_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://mlcharitywebapi-g6evcsavaqf6drej.centralindia-01.azurewebsites.net')

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
    envPrefix: ['VITE_', 'API', 'AZURE_', 'BACKEND_'],
    define: {
      'import.meta.env.APIKEY': JSON.stringify(azureApiKey),
      'import.meta.env.API_KEY': JSON.stringify(azureApiKey),
      'import.meta.env.VITE_APIKEY': JSON.stringify(azureApiKey),
      'import.meta.env.VITE_API_KEY': JSON.stringify(azureApiKey),
      'import.meta.env.AZURE_API_KEY': JSON.stringify(azureApiKey),
      'import.meta.env.VITE_AZURE_API_KEY': JSON.stringify(azureApiKey),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(normalizedApiUrl),
      'import.meta.env.API_BASE_URL': JSON.stringify(normalizedApiUrl),
      'import.meta.env.VITE_API_URL': JSON.stringify(normalizedApiUrl),
      'import.meta.env.API_URL': JSON.stringify(normalizedApiUrl),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendTarget),
      'import.meta.env.BACKEND_URL': JSON.stringify(backendTarget),
      'import.meta.env.VITE_API_ENDPOINT': JSON.stringify(normalizedApiUrl),
      'import.meta.env.API_ENDPOINT': JSON.stringify(normalizedApiUrl)
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

