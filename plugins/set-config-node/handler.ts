import { BaseNode, SetConfigNodeData } from '@automflows/shared';
import { NodeHandler } from '../../backend/src/nodes/base';
import { ContextManager } from '../../backend/src/engine/context';

/**
 * Helper function to merge an object into context.data
 * (Reuse from backend/src/nodes/config.ts)
 * If contextKey is provided, stores under that key, otherwise merges into root
 */
function mergeIntoContext(context: ContextManager, data: Record<string, any>, contextKey?: string): void {
  if (contextKey) {
    // Store under a specific key
    context.setData(contextKey, data);
  } else {
    // Merge into root of context.data
    // Set each top-level key individually to preserve nested structure
    for (const [key, value] of Object.entries(data)) {
      context.setData(key, value);
    }
  }
}

export class SetConfigHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as SetConfigNodeData;

    if (!data.config || Object.keys(data.config).length === 0) {
      // Empty config - no error, just skip
      return;
    }

    try {
      // Validate that config is an object
      if (typeof data.config !== 'object' || data.config === null || Array.isArray(data.config)) {
        throw new Error('Config must be a JSON object');
      }

      // Merge into context using same helper as LoadConfigFileHandler
      // This will overwrite existing keys if they exist
      mergeIntoContext(context, data.config, data.contextKey);
    } catch (error: any) {
      throw new Error(`Failed to set config: ${error.message}`);
    }
  }
}

// Export handler by node type for plugin loader
export default {
  'setConfig.setConfig': SetConfigHandler,
};
