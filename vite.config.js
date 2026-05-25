import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// React + Vite. Audio files are served as static assets from public/audio.
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173 },
  publicDir: 'public',
  build: { outDir: 'dist', sourcemap: true },
});
