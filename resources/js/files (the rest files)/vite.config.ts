// vite.config.ts
import { defineConfig } from 'vite';
import react     from '@vitejs/plugin-react';
import path      from 'path';
import laravel   from 'laravel-vite-plugin';

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/js/app.jsx'],
      refresh: true,
    }),
    react(),
  ],

  resolve: {
    alias: {
      // ← تسهيل الاستيرادات
      '@': path.resolve(__dirname, './resources/js'),
    },
  },

  build: {
    // Code splitting بالمانويل لتحسين التحميل
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Data layer
          'data-vendor':  ['@tanstack/react-query', 'axios', 'zustand'],
          // Utils
          'utils-vendor': ['nanoid'],
        },
      },
    },
    // تحسين الحجم
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },

  server: {
    // HMR سريع في التطوير
    hmr: {
      overlay: true,
    },
  },
});
