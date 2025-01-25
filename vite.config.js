import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/convert': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/download': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: '/index.html'
      }
    }
  }
});