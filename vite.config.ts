import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // VITE_BASE_PATH is injected by CI for GitHub Pages (e.g. /task-management/).
  // Falls back to '/' for local dev and custom-domain deployments.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Dev-only proxy — not used in production builds.
    // Set VITE_API_URL in frontend/.env for standalone deployment.
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
