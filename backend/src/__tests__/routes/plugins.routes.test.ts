import request from 'supertest';
import { createApp } from '../../app';
import { pluginRegistry } from '../../plugins/registry';
import type { Express } from 'express';
import type { PluginMetadata, PluginManifest } from '@automflows/shared';

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    name: 'Default',
    version: '1.0.0',
    description: 'desc',
    nodes: [],
    ...overrides,
  };
}

function makeMetadata(id: string, manifest: PluginManifest): PluginMetadata {
  return { id, manifest, path: `/fake/${id}`, loaded: true };
}

let app: Express;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(() => {
  pluginRegistry.clear();
});

describe('GET /api/plugins', () => {
  it('returns 200 with empty array when no plugins loaded', async () => {
    const res = await request(app).get('/api/plugins');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns plugin metadata for registered plugins', async () => {
    pluginRegistry.registerPlugin({
      metadata: makeMetadata('test-plugin', makeManifest({ name: 'Test Plugin' })),
      handlers: new Map(),
    });

    const res = await request(app).get('/api/plugins');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 'test-plugin',
      manifest: { name: 'Test Plugin', version: '1.0.0' },
    });
  });

  it('returns multiple plugins', async () => {
    pluginRegistry.registerPlugin({
      metadata: makeMetadata('plugin-a', makeManifest({ name: 'Plugin A' })),
      handlers: new Map(),
    });
    pluginRegistry.registerPlugin({
      metadata: makeMetadata('plugin-b', makeManifest({ name: 'Plugin B', version: '2.0.0' })),
      handlers: new Map(),
    });

    const res = await request(app).get('/api/plugins');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const ids = res.body.map((p: any) => p.id);
    expect(ids).toContain('plugin-a');
    expect(ids).toContain('plugin-b');
  });
});

describe('GET /api/plugins/:pluginId', () => {
  it('returns 404 for unknown plugin', async () => {
    const res = await request(app).get('/api/plugins/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Plugin not found');
  });

  it('returns metadata for existing plugin', async () => {
    pluginRegistry.registerPlugin({
      metadata: makeMetadata('my-plugin', makeManifest({ name: 'My Plugin', version: '3.0.0' })),
      handlers: new Map(),
    });

    const res = await request(app).get('/api/plugins/my-plugin');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'my-plugin',
      manifest: { name: 'My Plugin', version: '3.0.0' },
    });
  });
});
