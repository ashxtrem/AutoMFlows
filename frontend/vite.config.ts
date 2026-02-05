import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import * as fs from 'fs';

// Read backend port from file if it exists, with retry logic
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
  // Default fallback - will be updated when backend starts
  return process.env.VITE_BACKEND_PORT ? parseInt(process.env.VITE_BACKEND_PORT, 10) : 3003;
}

// Get backend port (will be updated dynamically via proxy)
const backendPort = getBackendPort();

// Plugin to suppress expected proxy errors during startup
const suppressStartupProxyErrors = (): Plugin => {
  return {
    name: 'suppress-startup-proxy-errors',
    configureServer(server) {
      // Only suppress errors during the first 15 seconds (startup period)
      const startTime = Date.now();
      const originalConsoleError = console.error;
      
      console.error = (...args: any[]) => {
        const elapsed = Date.now() - startTime;
        
        // During startup, filter out expected ECONNREFUSED errors for port discovery
        if (elapsed < 15000) {
          const message = args[0];
          // Check if it's a Vite proxy error for the port discovery endpoint
          if (
            typeof message === 'string' &&
            message.includes('[vite] http proxy error') &&
            message.includes('.automflows-port')
          ) {
            // Check if it's an ECONNREFUSED error (expected during startup)
            const errorStr = args.map(a => String(a)).join(' ');
            if (errorStr.includes('ECONNREFUSED')) {
              // Silently ignore - backend will be ready soon
              return;
            }
          }
        }
        
        // Pass through all other errors
        originalConsoleError(...args);
      };
      
      // Restore original console.error after startup period
      setTimeout(() => {
        console.error = originalConsoleError;
      }, 15000);
    },
  };
};

// Plugin to prevent auto-refresh on server restart
const preventAutoRefresh = (): Plugin => {
  return {
    name: 'prevent-auto-refresh',
    transformIndexHtml(html) {
      // Inject script to handle Vite HMR reload prevention
      return html.replace(
        '</head>',
        `<script type="module">
          if (import.meta.hot) {
            import.meta.hot.on('vite:beforeFullReload', () => {
              const preventAutoRefresh = sessionStorage.getItem('prevent-auto-refresh') === 'true';
              if (preventAutoRefresh) {
                // Prevent the reload by stopping propagation
                // The socket disconnect handler will show the warning popup
                console.log('Preventing auto-refresh - showing warning popup instead');
                // Note: Vite doesn't allow cancelling reloads directly,
                // but the warning popup will be shown by the socket disconnect handler
              }
            });
          }
        </script></head>`
      );
    },
  };
};

export default defineConfig({
  plugins: [react(), suppressStartupProxyErrors(), preventAutoRefresh()],
  resolve: {
    alias: {
      '@automflows/shared': path.resolve(__dirname, '../shared/src'),
      '@plugins': path.resolve(__dirname, '../plugins'),
    },
  },
  server: {
    port: 5173,
    hmr: {
      // Prevent automatic full page reload on server restart
      // We'll show a warning popup instead and let user decide
      overlay: true,
    },
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
        // Handle connection errors gracefully during startup
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            // Suppress ECONNREFUSED errors during startup (backend not ready yet)
            if ((err as any).code === 'ECONNREFUSED') {
              // Don't log these errors - they're expected during startup
              return;
            }
            console.error('Proxy error:', err);
          });
        },
      },
      '/socket.io': {
        target: `http://localhost:${backendPort}`,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            if ((err as any).code === 'ECONNREFUSED') {
              return;
            }
            console.error('Proxy error:', err);
          });
        },
      },
      '/.automflows-port': {
        target: `http://localhost:${backendPort}`,
        rewrite: (path) => '/.automflows-port',
        // Suppress connection errors for port discovery endpoint
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            // Silently handle ECONNREFUSED - backend will be ready soon
            if ((err as any).code === 'ECONNREFUSED') {
              // Return 503 to indicate service unavailable (expected during startup)
              if (res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
                res.end('Service temporarily unavailable');
              }
              return;
            }
            console.error('Proxy error:', err);
          });
        },
      },
    },
  },
});

