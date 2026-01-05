import { LoadedPlugin } from './types';
import { NodeHandler } from '../nodes/base';

export class PluginRegistry {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private handlers: Map<string, NodeHandler> = new Map(); // Global handler registry

  registerPlugin(plugin: LoadedPlugin): void {
    this.plugins.set(plugin.metadata.id, plugin);
    
    // Register all handlers from this plugin
    plugin.handlers.forEach((handler, nodeType) => {
      if (this.handlers.has(nodeType)) {
        console.warn(`Warning: Node type ${nodeType} already registered. Plugin ${plugin.metadata.id} handler will override.`);
      }
      this.handlers.set(nodeType, handler);
    });

    console.log(`Plugin ${plugin.metadata.id} registered with ${plugin.handlers.size} node handler(s)`);
  }

  unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    // Remove handlers registered by this plugin
    plugin.handlers.forEach((_, nodeType) => {
      this.handlers.delete(nodeType);
    });

    this.plugins.delete(pluginId);
    console.log(`Plugin ${pluginId} unregistered`);
  }

  getHandler(nodeType: string): NodeHandler | undefined {
    return this.handlers.get(nodeType);
  }

  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  clear(): void {
    this.plugins.clear();
    this.handlers.clear();
  }
}

export const pluginRegistry = new PluginRegistry();

