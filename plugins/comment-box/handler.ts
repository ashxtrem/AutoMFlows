import { BaseNode } from '@automflows/shared';
import { NodeHandler } from '../../backend/src/nodes/base';
import { ContextManager } from '../../backend/src/engine/context';

export class CommentBoxHandler implements NodeHandler {
  async execute(_node: BaseNode, _context: ContextManager): Promise<void> {
    // Comment box is a utility node - it doesn't execute anything
    // This handler exists only to satisfy the plugin interface
    return;
  }
}

// Export handler by node type for plugin loader
export default {
  'comment-box.comment': CommentBoxHandler,
};
