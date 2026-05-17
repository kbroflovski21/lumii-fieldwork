import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/lumii-fieldwork/careworker/',
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        careworker: 'careworker.html',
        hardware: 'careworkerhardware.html',
      },
    },
  },
})
