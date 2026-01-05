import { BaseNode, NodeType } from '@automflows/shared';
import { ContextManager } from '../engine/context';

export interface NodeHandler {
  execute(node: BaseNode, context: ContextManager): Promise<void>;
}

export type NodeHandlerMap = {
  [key in NodeType]?: NodeHandler;
};

