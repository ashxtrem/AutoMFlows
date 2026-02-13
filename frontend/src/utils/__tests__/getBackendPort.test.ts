import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBackendPort, getCachedBackendPort } from '../getBackendPort';

describe('getBackendPort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-level cache
    vi.resetModules();
  });

  it('should return default port when port file not available', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const port = await getBackendPort();
    expect(port).toBe(3003);
  });

  it('should return port from environment variable', async () => {
    const originalEnv = import.meta.env.VITE_BACKEND_PORT;
    (import.meta.env as any).VITE_BACKEND_PORT = '4000';
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    
    const port = await getBackendPort();
    expect(port).toBe(4000);
    
    (import.meta.env as any).VITE_BACKEND_PORT = originalEnv;
  });

  it('should cache port after first fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const port1 = await getCachedBackendPort();
    const port2 = await getCachedBackendPort();
    expect(port1).toBe(port2);
  });
});
