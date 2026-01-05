import fs from 'fs/promises';
import path from 'path';
import { PluginManifest, PluginMetadata } from '@automflows/shared';
import { PluginLoadResult, LoadedPlugin } from './types';
import { NodeHandler } from '../nodes/base';
import { BaseNode } from '@automflows/shared';
import { ContextManager } from '../engine/context';

export class PluginLoader {
  private pluginsDirectory: string;

  constructor(pluginsDirectory: string) {
    this.pluginsDirectory = pluginsDirectory;
  }

  async discoverPlugins(): Promise<string[]> {
    try {
      await fs.access(this.pluginsDirectory);
    } catch {
      // Plugins directory doesn't exist, create it
      await fs.mkdir(this.pluginsDirectory, { recursive: true });
      return [];
    }

    const entries = await fs.readdir(this.pluginsDirectory, { withFileTypes: true });
    const pluginDirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    return pluginDirs;
  }

  async loadPlugin(pluginId: string): Promise<PluginLoadResult> {
    const pluginPath = path.join(this.pluginsDirectory, pluginId);
    
    try {
      // Check if plugin directory exists
      try {
        await fs.access(pluginPath);
      } catch {
        return {
          success: false,
          error: `Plugin directory not found: ${pluginPath}`,
        };
      }

      // Load manifest
      const manifestPath = path.join(pluginPath, 'plugin.json');
      let manifestContent: string;
      try {
        manifestContent = await fs.readFile(manifestPath, 'utf-8');
      } catch {
        return {
          success: false,
          error: `Plugin manifest not found: ${manifestPath}`,
        };
      }

      let manifest: PluginManifest;
      try {
        manifest = JSON.parse(manifestContent);
      } catch (error: any) {
        return {
          success: false,
          error: `Invalid plugin manifest JSON: ${error.message}`,
        };
      }

      // Validate manifest
      const validationError = this.validateManifest(manifest);
      if (validationError) {
        return {
          success: false,
          error: `Invalid plugin manifest: ${validationError}`,
        };
      }

      // Load handlers
      const handlers = new Map<string, NodeHandler>();
      const loadedModules = new Map<string, any>(); // Cache loaded modules by path
      
      // Load handlers for each node definition
      for (const nodeDef of manifest.nodes) {
        try {
          const handlerPath = path.join(pluginPath, nodeDef.handlerPath);
          const handlerModulePath = handlerPath.replace(/\.ts$/, '');
          
          // Load module (cache to avoid reloading same file)
          let handlerModule: any;
          if (loadedModules.has(handlerModulePath)) {
            handlerModule = loadedModules.get(handlerModulePath);
          } else {
            try {
              // Use require for CommonJS modules
              delete require.cache[require.resolve(handlerModulePath)];
              handlerModule = require(handlerModulePath);
              loadedModules.set(handlerModulePath, handlerModule);
            } catch (error: any) {
              return {
                success: false,
                error: `Failed to load handler module ${handlerModulePath}: ${error.message}`,
              };
            }
          }
          
          // Look for handler by node type in the module
          let HandlerClass: any;
          
          // Check if module exports handlers by node type
          if (handlerModule[nodeDef.type]) {
            HandlerClass = handlerModule[nodeDef.type];
          } else if (handlerModule.default && handlerModule.default[nodeDef.type]) {
            HandlerClass = handlerModule.default[nodeDef.type];
          } else if (handlerModule.default && typeof handlerModule.default === 'function') {
            // Single default export (for plugins with one handler)
            // Only use if this is the only node or if it matches
            if (manifest.nodes.length === 1) {
              HandlerClass = handlerModule.default;
            } else {
              // Try to find any class that implements NodeHandler
              const exports = Object.values(handlerModule);
              HandlerClass = exports.find((exp: any) => 
                exp && typeof exp === 'function' && exp.prototype && 
                typeof exp.prototype.execute === 'function'
              );
            }
          } else {
            // Try to find any class that implements NodeHandler
            const exports = Object.values(handlerModule);
            HandlerClass = exports.find((exp: any) => 
              exp && typeof exp === 'function' && exp.prototype && 
              typeof exp.prototype.execute === 'function'
            );
          }

          if (!HandlerClass) {
            throw new Error(`No handler class found for node type ${nodeDef.type} in ${handlerModulePath}`);
          }

          const handlerInstance = new HandlerClass();
          
          // Verify it implements NodeHandler interface
          if (typeof handlerInstance.execute !== 'function') {
            throw new Error(`Handler class does not implement execute method`);
          }

          handlers.set(nodeDef.type, handlerInstance as NodeHandler);
        } catch (error: any) {
          return {
            success: false,
            error: `Failed to load handler for node type ${nodeDef.type}: ${error.message}`,
          };
        }
      }

      const metadata: PluginMetadata = {
        id: pluginId,
        manifest,
        path: pluginPath,
        loaded: true,
      };

      const loadedPlugin: LoadedPlugin = {
        metadata,
        handlers,
      };

      return {
        success: true,
        plugin: loadedPlugin,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to load plugin: ${error.message}`,
      };
    }
  }

  async loadAllPlugins(): Promise<PluginLoadResult[]> {
    const pluginIds = await this.discoverPlugins();
    const results: PluginLoadResult[] = [];

    for (const pluginId of pluginIds) {
      const result = await this.loadPlugin(pluginId);
      results.push(result);
      
      if (!result.success) {
        console.error(`Failed to load plugin ${pluginId}:`, result.error);
      }
    }

    return results;
  }

  private validateManifest(manifest: any): string | null {
    if (!manifest.name || typeof manifest.name !== 'string') {
      return 'Missing or invalid "name" field';
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      return 'Missing or invalid "version" field';
    }
    if (!manifest.description || typeof manifest.description !== 'string') {
      return 'Missing or invalid "description" field';
    }
    if (!manifest.nodes || !Array.isArray(manifest.nodes)) {
      return 'Missing or invalid "nodes" field (must be an array)';
    }
    if (manifest.nodes.length === 0) {
      return 'Plugin must define at least one node';
    }

    for (let i = 0; i < manifest.nodes.length; i++) {
      const node = manifest.nodes[i];
      const prefix = `Node ${i + 1}`;
      
      if (!node.type || typeof node.type !== 'string') {
        return `${prefix}: Missing or invalid "type" field`;
      }
      if (!node.label || typeof node.label !== 'string') {
        return `${prefix}: Missing or invalid "label" field`;
      }
      if (!node.category || typeof node.category !== 'string') {
        return `${prefix}: Missing or invalid "category" field`;
      }
      if (!node.handlerPath || typeof node.handlerPath !== 'string') {
        return `${prefix}: Missing or invalid "handlerPath" field`;
      }
    }

    return null;
  }
}

