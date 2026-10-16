import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only proxy: the browser calls /opensky/api/... and Vite forwards it to
// opensky-network.org. This avoids CORS problems while developing.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/opensky/, ''),
      },
    },
  },
});
