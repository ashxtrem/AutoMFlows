import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import * as fs from 'fs';

// Read backend port from file if it exists
function getBackendPort(): number {
  const portFile = path.join(__dirname, '../.automflows-port');
  if (fs.existsSync(portFile)) {
    try {
      const port = parseInt(fs.readFileSync(portFile, 'utf8').trim(), 10);
      if (!isNaN(port)) {
        return port;
      }
    } catch (error) {
      // Ignore errors
    }
  }
  // Default fallback
  return process.env.VITE_BACKEND_PORT ? parseInt(process.env.VITE_BACKEND_PORT, 10) : 3003;
}

const backendPort = getBackendPort();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@automflows/shared': path.resolve(__dirname, '../shared/src'),
      '@plugins': path.resolve(__dirname, '../plugins'),
    },
  },
  optimizeDeps: {
    exclude: ['litegraph.js'], // Exclude from optimization - it needs browser context
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    commonjsOptions: {
      // Transform CommonJS modules
      transformMixedEsModules: true,
      defaultIsModuleExports: 'auto',
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      '/socket.io': {
        target: `http://localhost:${backendPort}`,
        ws: true,
      },
      '/.automflows-port': {
        target: `http://localhost:${backendPort}`,
        rewrite: (path) => '/.automflows-port',
      },
    },
  },
});
