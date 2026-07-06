import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: "./",
  plugins: [vue()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8098',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:8098',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
