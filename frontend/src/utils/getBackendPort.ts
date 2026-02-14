/**
 * Get the backend port from the port file or environment variable
 */
export async function getBackendPort(): Promise<number> {
  // In development, try to read from port file
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/.automflows-port');
      if (response.ok) {
        const port = parseInt(await response.text(), 10);
        if (!isNaN(port)) {
          return port;
        }
      }
    } catch (error) {
      // Ignore errors, fall back to default
    }
  }

  // Fallback to environment variable or default
  const envPort = import.meta.env.VITE_BACKEND_PORT;
  if (envPort) {
    return parseInt(envPort, 10);
  }

  // Default fallback (will be overridden by actual port)
  return 3003;
}

/**
 * Build backend base URL using the same host as the current page (for LAN access).
 * When the app is opened at http://LAN_IP:5173, API calls go to http://LAN_IP:port.
 */
export function getBackendBaseUrl(port: number): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return `http://localhost:${port}`;
}

// Cache the port once fetched
let cachedPort: number | null = null;

export async function getCachedBackendPort(): Promise<number> {
  if (cachedPort) {
    return cachedPort;
  }
  
  cachedPort = await getBackendPort();
  return cachedPort;
}

