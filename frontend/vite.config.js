import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const FRONT_PORT = parseInt(process.env.VITE_FRONT_PORT || process.env.PORT || '3000', 10);
const BACKEND_PORT = parseInt(process.env.VITE_BACKEND_PORT || '3001', 10);
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: FRONT_PORT,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        timeout: 120000,
      },
      '/generated_images': BACKEND_URL,
    },
  },
});
