import { FrontendPlugin, LoadedPluginNode } from './types';
import { PluginNodeDefinition } from '@automflows/shared';

export class FrontendPluginRegistry {
  private plugins: Map<string, FrontendPlugin> = new Map();
  private nodeDefinitions: Map<string, PluginNodeDefinition> = new Map(); // nodeType -> definition

  registerPlugin(plugin: FrontendPlugin): void {
    this.plugins.set(plugin.id, plugin);
    
    // Register all node definitions from this plugin
    plugin.nodes.forEach((node, nodeType) => {
      this.nodeDefinitions.set(nodeType, node.definition);
    });

    console.log(`Frontend plugin ${plugin.id} registered with ${plugin.nodes.size} node(s)`);
  }

  getNodeDefinition(nodeType: string): PluginNodeDefinition | undefined {
    return this.nodeDefinitions.get(nodeType);
  }

  getPluginNode(nodeType: string): LoadedPluginNode | undefined {
    for (const plugin of this.plugins.values()) {
      const node = plugin.nodes.get(nodeType);
      if (node) {
        return node;
      }
    }
    return undefined;
  }

  getAllPlugins(): FrontendPlugin[] {
    return Array.from(this.plugins.values());
  }

  getAllNodeDefinitions(): PluginNodeDefinition[] {
    return Array.from(this.nodeDefinitions.values());
  }

  getPlugin(pluginId: string): FrontendPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  clear(): void {
    this.plugins.clear();
    this.nodeDefinitions.clear();
  }
}

export const frontendPluginRegistry = new FrontendPluginRegistry();

