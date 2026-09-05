import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative asset paths: works at a domain root and under a
  // GitHub Pages project subpath (/kidsclock/) without extra config.
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
})
