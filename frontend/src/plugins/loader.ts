import { PluginMetadata, PluginNodeDefinition } from '@automflows/shared';
import { FrontendPlugin, LoadedPluginNode, PluginConfigComponentProps } from './types';
import { frontendPluginRegistry } from './registry';

export async function loadPlugins(backendPort: number): Promise<void> {
  try {
    const response = await fetch(`http://localhost:${backendPort}/api/plugins`);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugins: ${response.statusText}`);
    }

    const plugins: PluginMetadata[] = await response.json();

    for (const pluginMetadata of plugins) {
      if (!pluginMetadata.loaded) {
        console.warn(`Plugin ${pluginMetadata.id} is not loaded:`, pluginMetadata.error);
        continue;
      }

      const plugin: FrontendPlugin = {
        id: pluginMetadata.id,
        manifest: pluginMetadata.manifest,
        nodes: new Map(),
      };

      // Load each node definition
      for (const nodeDef of pluginMetadata.manifest.nodes) {
        const loadedNode: LoadedPluginNode = {
          definition: nodeDef,
          icon: nodeDef.icon,
        };

        // Try to load config component if specified
        if (nodeDef.configComponentPath) {
          try {
            // For now, we'll use a dynamic import approach
            // In a real implementation, you might need to serve plugin files or use a different loading mechanism
            // This is a placeholder - actual implementation depends on how plugins are served
            console.log(`Config component path specified for ${nodeDef.type}: ${nodeDef.configComponentPath}`);
            // TODO: Implement dynamic component loading based on plugin serving strategy
          } catch (error) {
            console.warn(`Failed to load config component for ${nodeDef.type}:`, error);
          }
        }

        plugin.nodes.set(nodeDef.type, loadedNode);
      }

      frontendPluginRegistry.registerPlugin(plugin);
    }

    console.log(`Loaded ${plugins.length} plugin(s) in frontend`);
  } catch (error) {
    console.error('Failed to load plugins:', error);
  }
}

