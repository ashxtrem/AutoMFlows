import { PluginMetadata } from '@automflows/shared';
import { NodeHandler } from '../nodes/base';

export interface LoadedPlugin {
  metadata: PluginMetadata;
  handlers: Map<string, NodeHandler>; // Map of nodeType -> handler
}

export interface PluginLoadResult {
  success: boolean;
  plugin?: LoadedPlugin;
  error?: string;
}

