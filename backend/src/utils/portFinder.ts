import { createServer } from 'net';

const EXCLUDED_PORTS = [3000, 3001, 3002, 8188, 8080, 9090];

/**
 * Find an available port starting from 3003, skipping excluded ports
 */
export async function findAvailablePort(startPort: number = 3003): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      // Skip excluded ports
      if (EXCLUDED_PORTS.includes(port)) {
        tryPort(port + 1);
        return;
      }

      const server = createServer();
      
      server.listen(port, () => {
        const foundPort = (server.address() as any)?.port;
        server.close(() => {
          resolve(foundPort);
        });
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    };

    tryPort(startPort);
  });
}

