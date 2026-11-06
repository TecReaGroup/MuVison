import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Must match [server] in backend/config.toml
const BACKEND_URL = 'http://127.0.0.1:8000'
const proxy = { '/api': BACKEND_URL }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 8443, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 8443, strictPort: true, proxy },
})
