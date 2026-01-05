import { NodeType, BaseNode } from '@automflows/shared';
import { NodeHandler, NodeHandlerMap } from './base';
import { ContextManager } from '../engine/context';
import { OpenBrowserHandler, NavigateHandler } from './browser';
import { ClickHandler, TypeHandler } from './interaction';
import { GetTextHandler, ScreenshotHandler, WaitHandler } from './utility';
import { JavaScriptCodeHandler, LoopHandler } from './logic';
import { pluginRegistry } from '../plugins/registry';

// Start node handler (no-op)
class StartHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    // Start node is a no-op, just marks the beginning of the workflow
  }
}

const handlers: NodeHandlerMap = {
  [NodeType.START]: new StartHandler(),
  [NodeType.OPEN_BROWSER]: new OpenBrowserHandler(),
  [NodeType.NAVIGATE]: new NavigateHandler(),
  [NodeType.CLICK]: new ClickHandler(),
  [NodeType.TYPE]: new TypeHandler(),
  [NodeType.GET_TEXT]: new GetTextHandler(),
  [NodeType.SCREENSHOT]: new ScreenshotHandler(),
  [NodeType.WAIT]: new WaitHandler(),
  [NodeType.JAVASCRIPT_CODE]: new JavaScriptCodeHandler(),
  [NodeType.LOOP]: new LoopHandler(),
};

export function getNodeHandler(nodeType: NodeType | string): NodeHandler | undefined {
  // First check built-in handlers (check if value exists in enum values)
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    return handlers[nodeType as NodeType];
  }
  
  // Then check plugin registry for custom node types
  return pluginRegistry.getHandler(nodeType);
}

export * from './base';
export * from './browser';
export * from './interaction';
export * from './utility';
export * from './logic';

