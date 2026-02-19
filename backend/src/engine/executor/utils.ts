import { BaseNode, NodeType, Workflow, SelectorModifiers } from '@automflows/shared';

/**
 * Extract workflow name from workflow
 * Uses provided filename if available, otherwise falls back to Start node label
 */
export function extractWorkflowName(workflow: Workflow, workflowFileName?: string): string {
  // Use provided filename if available
  if (workflowFileName) {
    return workflowFileName;
  }
  // Try to find a Start node and use its label, or use default
  const startNode = workflow.nodes.find(node => node.type === NodeType.START);
  if (startNode && (startNode.data as any)?.label) {
    // Use start node label, sanitized for filesystem
    return (startNode.data as any).label.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'workflow';
  }
  return 'workflow';
}

/**
 * Check if a node is a UI node (requires browser page)
 */
export function isUINode(node: BaseNode): boolean {
  const nodeType = node.type;
  const nodeData = node.data as any;

  // Built-in UI nodes
  if (nodeType === NodeType.ACTION || 
      nodeType === NodeType.TYPE || 
      nodeType === NodeType.ELEMENT_QUERY || 
      nodeType === NodeType.SCREENSHOT) {
    return true;
  }

  // Navigation node with waitForSelector
  if (nodeType === NodeType.NAVIGATION && nodeData?.waitForSelector) {
    return true;
  }

  // Wait node with selector waitType
  if (nodeType === NodeType.WAIT && nodeData?.waitType === 'selector') {
    return true;
  }

  // Plugin nodes that have selector property
  if (nodeData?.selector) {
    return true;
  }

  return false;
}

/**
 * Extract selector information from node data
 */
export function extractSelectorInfo(node: BaseNode): { selector?: string; selectorType?: 'css' | 'xpath'; selectorModifiers?: SelectorModifiers } {
  const nodeData = node.data as any;
  const nodeType = node.type;

  // Built-in nodes with selector property
  if (nodeType === NodeType.ACTION ||
      nodeType === NodeType.TYPE ||
      nodeType === NodeType.ELEMENT_QUERY) {
    return {
      selector: nodeData?.selector,
      selectorType: nodeData?.selectorType || 'css',
      selectorModifiers: nodeData?.selectorModifiers,
    };
  }

  // Navigation node with waitForSelector
  if (nodeType === NodeType.NAVIGATION && nodeData?.waitForSelector) {
    return {
      selector: nodeData.waitForSelector,
      selectorType: nodeData.waitForSelectorType || 'css',
      selectorModifiers: nodeData.waitForSelectorModifiers,
    };
  }

  // Wait node with selector waitType
  if (nodeType === NodeType.WAIT && nodeData?.waitType === 'selector') {
    return {
      selector: typeof nodeData.value === 'string' ? nodeData.value : undefined,
      selectorType: nodeData.selectorType || 'css',
      selectorModifiers: nodeData.selectorModifiers,
    };
  }

  // Plugin nodes
  if (nodeData?.selector) {
    return {
      selector: nodeData.selector,
      selectorType: nodeData.selectorType || 'css',
      selectorModifiers: nodeData.selectorModifiers,
    };
  }

  return {};
}
