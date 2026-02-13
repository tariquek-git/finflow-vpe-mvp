import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'diagram-vendor': ['@xyflow/react'],
          'forms-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'export-vendor': ['html-to-image', 'jspdf', 'dompurify'],
          'icons-vendor': ['lucide-react']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});
