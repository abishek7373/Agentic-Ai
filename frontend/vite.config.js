import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,                 // allow LAN access
    port: 5173,
    allowedHosts: ['myapp.local'],  // allow your custom domain

    proxy: {
      '/auth': 'http://localhost:5000',
      '/chat': 'http://localhost:5000',
      '/gmail': 'http://localhost:5000',
      '/calendar': 'http://localhost:5000',
      '/email': 'http://localhost:5000',
    },
  },
});