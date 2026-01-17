import { NodeType, BaseNode } from '@automflows/shared';
import { NodeHandler, NodeHandlerMap } from './base';
import { ContextManager } from '../engine/context';
import { OpenBrowserHandler, NavigationHandler } from './browser';
import { TypeHandler, ActionHandler, FormInputHandler, KeyboardHandler, ScrollHandler } from './interaction';
import { ElementQueryHandler, ScreenshotHandler, WaitHandler, IntValueHandler, StringValueHandler, BooleanValueHandler, InputValueHandler, VerifyHandler, StorageHandler, DialogHandler, DownloadHandler, IframeHandler } from './utility';
import { JavaScriptCodeHandler, LoopHandler } from './logic';
import { ApiRequestHandler, ApiCurlHandler } from './api';
import { LoadConfigFileHandler, SelectConfigFileHandler } from './config';
import { DbConnectHandler, DbDisconnectHandler, DbQueryHandler } from './database';
import { pluginRegistry } from '../plugins/registry';

// Start node handler (no-op)
class StartHandler implements NodeHandler {
  async execute(_node: BaseNode, _context: ContextManager): Promise<void> {
    // Start node is a no-op, just marks the beginning of the workflow
  }
}

const handlers: NodeHandlerMap = {
  [NodeType.START]: new StartHandler(),
  [NodeType.OPEN_BROWSER]: new OpenBrowserHandler(),
  [NodeType.NAVIGATION]: new NavigationHandler(),
  [NodeType.TYPE]: new TypeHandler(),
  [NodeType.ACTION]: new ActionHandler(),
  [NodeType.ELEMENT_QUERY]: new ElementQueryHandler(),
  [NodeType.FORM_INPUT]: new FormInputHandler(),
  [NodeType.KEYBOARD]: new KeyboardHandler(),
  [NodeType.SCROLL]: new ScrollHandler(),
  [NodeType.SCREENSHOT]: new ScreenshotHandler(),
  [NodeType.STORAGE]: new StorageHandler(),
  [NodeType.DIALOG]: new DialogHandler(),
  [NodeType.DOWNLOAD]: new DownloadHandler(),
  [NodeType.IFRAME]: new IframeHandler(),
  [NodeType.WAIT]: new WaitHandler(),
  [NodeType.JAVASCRIPT_CODE]: new JavaScriptCodeHandler(),
  [NodeType.LOOP]: new LoopHandler(),
  [NodeType.INT_VALUE]: new IntValueHandler(),
  [NodeType.STRING_VALUE]: new StringValueHandler(),
  [NodeType.BOOLEAN_VALUE]: new BooleanValueHandler(),
  [NodeType.INPUT_VALUE]: new InputValueHandler(),
  [NodeType.VERIFY]: new VerifyHandler(),
  [NodeType.API_REQUEST]: new ApiRequestHandler(),
  [NodeType.API_CURL]: new ApiCurlHandler(),
  [NodeType.LOAD_CONFIG_FILE]: new LoadConfigFileHandler(),
  [NodeType.SELECT_CONFIG_FILE]: new SelectConfigFileHandler(),
  [NodeType.DB_CONNECT]: new DbConnectHandler(),
  [NodeType.DB_DISCONNECT]: new DbDisconnectHandler(),
  [NodeType.DB_QUERY]: new DbQueryHandler(),
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
export * from './api';
export * from './config';
export * from './database';

