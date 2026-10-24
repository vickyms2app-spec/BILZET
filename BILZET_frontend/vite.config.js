import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    watch: {
      ignored: ['**/dist/**', '**/.git/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@clerk')) return 'vendor-clerk';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('html2canvas') || id.includes('dompurify')) return 'vendor-pdf';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('react-router-dom') ||
              id.includes('zustand') ||
              id.includes('react-hook-form') ||
              id.includes('@hookform')
            ) {
              return 'vendor-react';
            }
          }
          if (id.includes('/src/pages/superAdmin/') || id.includes('\\src\\pages\\superAdmin\\')) {
            return 'page-superadmin';
          }
          if (id.includes('/src/pages/Billing') || id.includes('\\src\\pages\\Billing') || id.includes('/src/components/pos/') || id.includes('\\src\\components\\pos\\')) {
            return 'page-billing';
          }
          if (id.includes('/src/pages/Reports') || id.includes('\\src\\pages\\Reports') || id.includes('/src/pages/Gst') || id.includes('\\src\\pages\\Gst')) {
            return 'page-reports-gst';
          }
        },
      },
    },
  },
});

