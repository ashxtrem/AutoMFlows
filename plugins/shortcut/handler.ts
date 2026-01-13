import { BaseNode } from '@automflows/shared';
import { NodeHandler } from '../../backend/src/nodes/base';
import { ContextManager } from '../../backend/src/engine/context';

export class ShortcutHandler implements NodeHandler {
  async execute(_node: BaseNode, _context: ContextManager): Promise<void> {
    // Shortcut is a utility node - it doesn't execute anything
    // This handler exists only to satisfy the plugin interface
    return;
  }
}

// Export handler by node type for plugin loader
export default {
  'shortcut.shortcut': ShortcutHandler,
};
