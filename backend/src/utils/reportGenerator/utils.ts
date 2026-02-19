import { NodeType, Workflow, BaseNode } from '@automflows/shared';
import { ExecutionMetadata, NodeExecutionEvent } from '../executionTracker';

/**
 * Get the default display label for a node type
 * Returns the human-readable label for built-in node types, or the nodeType string for plugin nodes
 */
export function getDefaultNodeLabel(nodeType: string): string {
  // Check if it's a built-in node type
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    const labels: Record<NodeType, string> = {
      [NodeType.START]: 'Start',
      [NodeType.OPEN_BROWSER]: 'Open Browser',
      [NodeType.NAVIGATION]: 'Navigation',
      [NodeType.KEYBOARD]: 'Keyboard',
      [NodeType.SCROLL]: 'Scroll',
      [NodeType.STORAGE]: 'Storage',
      [NodeType.DIALOG]: 'Dialog',
      [NodeType.DOWNLOAD]: 'Download',
      [NodeType.IFRAME]: 'Iframe',
      [NodeType.ACTION]: 'Action',
      [NodeType.ELEMENT_QUERY]: 'Element Query',
      [NodeType.FORM_INPUT]: 'Form Input',
      [NodeType.TYPE]: 'Type',
      [NodeType.SCREENSHOT]: 'Screenshot',
      [NodeType.WAIT]: 'Wait',
      [NodeType.JAVASCRIPT_CODE]: 'JavaScript Code',
      [NodeType.LOOP]: 'Loop',
      [NodeType.INT_VALUE]: 'Int Value',
      [NodeType.STRING_VALUE]: 'String Value',
      [NodeType.BOOLEAN_VALUE]: 'Boolean Value',
      [NodeType.INPUT_VALUE]: 'Input Value',
      [NodeType.VERIFY]: 'Verify',
      [NodeType.API_REQUEST]: 'API Request',
      [NodeType.API_CURL]: 'API cURL',
      [NodeType.LOAD_CONFIG_FILE]: 'Load Config File',
      [NodeType.SELECT_CONFIG_FILE]: 'Select Config File',
      [NodeType.DB_CONNECT]: 'DB Connect',
      [NodeType.DB_DISCONNECT]: 'DB Disconnect',
      [NodeType.DB_QUERY]: 'DB Query',
      [NodeType.DB_TRANSACTION_BEGIN]: 'DB Transaction Begin',
      [NodeType.DB_TRANSACTION_COMMIT]: 'DB Transaction Commit',
      [NodeType.DB_TRANSACTION_ROLLBACK]: 'DB Transaction Rollback',
      [NodeType.CONTEXT_MANIPULATE]: 'Context Manipulate',
      [NodeType.CSV_HANDLE]: 'CSV Handle',
    };
    return labels[nodeType as NodeType] || nodeType;
  }
  
  // For plugin nodes or unknown types, return the nodeType string
  return nodeType;
}

/**
 * Get the display name for a node (custom label, default label, or nodeId)
 */
export function getNodeDisplayName(node: NodeExecutionEvent): string {
  return node.nodeLabel || getDefaultNodeLabel(node.nodeType) || node.nodeId;
}

/**
 * Filter nodes to only include test nodes (isTest !== false)
 * Nodes with isTest: false are excluded from reports
 */
export function getTestNodes(metadata: ExecutionMetadata, workflow: Workflow): NodeExecutionEvent[] {
  return metadata.nodes.filter(node => {
    const workflowNode = workflow.nodes.find(n => n.id === node.nodeId);
    if (!workflowNode) {
      return true; // Include if node not found in workflow (shouldn't happen)
    }
    const nodeData = workflowNode.data as any;
    // Include node if isTest is true, undefined, or not explicitly false
    return nodeData?.isTest !== false;
  });
}

/**
 * Escape XML special characters
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get meaningful node properties for display in reports
 * Filters out internal/system properties
 */
export function getNodePropertiesForDisplay(node: BaseNode): Array<{key: string, value: any}> {
  if (!node || !node.data) {
    return [];
  }

  const data = node.data as Record<string, any>;
  const properties: Array<{key: string, value: any}> = [];
  
  // Properties to exclude (internal/system properties)
  const excludeKeys = [
    '_inputConnections',
    '_outputConnections',
    'isTest', // Already handled separately
  ];
  
  for (const [key, value] of Object.entries(data)) {
    // Skip excluded keys
    if (excludeKeys.includes(key)) {
      continue;
    }
    
    // Skip undefined/null values
    if (value === undefined || value === null) {
      continue;
    }
    
    // Skip empty strings
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    
    // Skip empty objects/arrays
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      continue;
    }
    
    // Format the value for display
    let displayValue: string;
    if (typeof value === 'object') {
      try {
        displayValue = JSON.stringify(value, null, 2);
      } catch {
        displayValue = String(value);
      }
    } else {
      displayValue = String(value);
    }
    
    properties.push({ key, value: displayValue });
  }
  
  return properties.sort((a, b) => a.key.localeCompare(b.key));
}
