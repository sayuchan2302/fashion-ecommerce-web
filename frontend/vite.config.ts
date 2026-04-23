import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const inNodeModules = (id: string) => id.includes('node_modules');

const includesAny = (id: string, segments: string[]) =>
  segments.some((segment) => id.includes(segment));

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react/jsx-runtime'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!inNodeModules(id)) {
            return undefined;
          }

          if (
            includesAny(id, [
              '/react/',
              '\\react\\',
              '/react-dom/',
              '\\react-dom\\',
              '/react-router-dom/',
              '\\react-router-dom\\',
            ])
          ) {
            return 'vendor-react';
          }

          if (
            includesAny(id, [
              '/lucide-react/',
              '\\lucide-react\\',
              '/framer-motion/',
              '\\framer-motion\\',
            ])
          ) {
            return 'vendor-ui';
          }

          if (includesAny(id, ['/recharts/', '\\recharts\\'])) {
            return 'vendor-charts';
          }

          if (
            includesAny(id, [
              '/@stomp/stompjs/',
              '\\@stomp\\stompjs\\',
              '/sockjs-client/',
              '\\sockjs-client\\',
            ])
          ) {
            return 'vendor-realtime';
          }

          return undefined;
        },
      },
    },
  },
});
