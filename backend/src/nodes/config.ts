import { BaseNode, LoadConfigFileNodeData, SelectConfigFileNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import fs from 'fs/promises';
import path from 'path';

/**
 * Helper function to merge an object into context.data
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

/**
 * Helper function to resolve file path (relative or absolute)
 * Relative paths are resolved from the project root
 */
function resolveFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  
  // Resolve relative path from project root
  // __dirname in compiled code: backend/dist/nodes -> go up 3 levels to project root
  // Similar to how server.ts resolves plugins path: path.join(__dirname, '../../plugins')
  // From backend/dist/nodes, go up 3 levels: ../../../ = project root
  const projectRoot = path.resolve(__dirname, '../../../');
  return path.resolve(projectRoot, filePath);
}

export class LoadConfigFileHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as LoadConfigFileNodeData;

    // New format: process configs array
    if (data.configs && Array.isArray(data.configs) && data.configs.length > 0) {
      const enabledConfigs = data.configs.filter(c => c.enabled);
      
      if (enabledConfigs.length === 0) {
        // No enabled configs - skip silently
        return;
      }

      // Process enabled configs in order
      for (const config of enabledConfigs) {
        try {
          // Parse JSON (trim whitespace first)
          let configData: Record<string, any>;
          try {
            configData = JSON.parse(config.fileContent.trim());
          } catch (error: any) {
            throw new Error(`Invalid JSON in config file "${config.fileName}": ${error.message}`);
          }

          // Validate that it's an object
          if (typeof configData !== 'object' || configData === null || Array.isArray(configData)) {
            throw new Error(`Config file "${config.fileName}" must contain a JSON object`);
          }

          // Merge into context (later configs override earlier ones for same keys)
          mergeIntoContext(context, configData, config.contextKey);
        } catch (error: any) {
          throw new Error(`Failed to load config file "${config.fileName}": ${error.message}`);
        }
      }
      return;
    }

    // Legacy format: use filePath
    if (data.filePath) {
      try {
        // Resolve file path (handles both relative and absolute)
        const resolvedPath = resolveFilePath(data.filePath);

        // Check if file exists
        try {
          await fs.access(resolvedPath);
        } catch {
          throw new Error(`Config file not found: ${resolvedPath}`);
        }

        // Read file content
        const fileContent = await fs.readFile(resolvedPath, 'utf-8');

        // Parse JSON (trim whitespace first)
        let configData: Record<string, any>;
        try {
          configData = JSON.parse(fileContent.trim());
        } catch (error: any) {
          throw new Error(`Invalid JSON in config file: ${error.message}`);
        }

        // Validate that it's an object
        if (typeof configData !== 'object' || configData === null || Array.isArray(configData)) {
          throw new Error('Config file must contain a JSON object');
        }

        // Merge into context
        mergeIntoContext(context, configData, data.contextKey);
      } catch (error: any) {
        throw new Error(`Failed to load config file: ${error.message}`);
      }
      return;
    }

    throw new Error('No config files specified. Please load at least one config file.');
  }
}

export class SelectConfigFileHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as SelectConfigFileNodeData;

    // New format: process configs array (same as LoadConfigFileHandler)
    if (data.configs && Array.isArray(data.configs) && data.configs.length > 0) {
      const enabledConfigs = data.configs.filter(c => c.enabled);
      
      if (enabledConfigs.length === 0) {
        // No enabled configs - skip silently
        return;
      }

      // Process enabled configs in order
      for (const config of enabledConfigs) {
        try {
          // Parse JSON (trim whitespace first)
          let configData: Record<string, any>;
          try {
            configData = JSON.parse(config.fileContent.trim());
          } catch (error: any) {
            throw new Error(`Invalid JSON in config file "${config.fileName}": ${error.message}`);
          }

          // Validate that it's an object
          if (typeof configData !== 'object' || configData === null || Array.isArray(configData)) {
            throw new Error(`Config file "${config.fileName}" must contain a JSON object`);
          }

          // Merge into context (later configs override earlier ones for same keys)
          mergeIntoContext(context, configData, config.contextKey);
        } catch (error: any) {
          throw new Error(`Failed to load config file "${config.fileName}": ${error.message}`);
        }
      }
      return;
    }

    // Legacy format: use fileContent
    if (data.fileContent) {
      try {
        // Parse JSON (trim whitespace first)
        let configData: Record<string, any>;
        try {
          configData = JSON.parse(data.fileContent.trim());
        } catch (error: any) {
          throw new Error(`Invalid JSON in config file: ${error.message}`);
        }

        // Validate that it's an object
        if (typeof configData !== 'object' || configData === null || Array.isArray(configData)) {
          throw new Error('Config file must contain a JSON object');
        }

        // Merge into context
        mergeIntoContext(context, configData, data.contextKey);
      } catch (error: any) {
        throw new Error(`Failed to load config file: ${error.message}`);
      }
      return;
    }

    throw new Error('No config files specified. Please load at least one config file.');
  }
}
