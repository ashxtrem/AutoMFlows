import { Edge } from 'reactflow';
import { NodeType, PropertyDataType } from '@automflows/shared';
import { frontendPluginRegistry } from '../../plugins/registry';

// Type conversion helper (frontend version)
export function canConvertType(sourceType: PropertyDataType, targetType: PropertyDataType): boolean {
  // Exact match always allowed
  if (sourceType === targetType) {
    return true;
  }
  // Numeric promotion allowed: int → float → double
  if (sourceType === PropertyDataType.INT && targetType === PropertyDataType.FLOAT) {
    return true;
  }
  if (sourceType === PropertyDataType.INT && targetType === PropertyDataType.DOUBLE) {
    return true;
  }
  if (sourceType === PropertyDataType.FLOAT && targetType === PropertyDataType.DOUBLE) {
    return true;
  }
  return false;
}

// Helper function to reconnect edges when a node is deleted
export function reconnectEdgesOnNodeDeletion(nodeId: string, edges: Edge[]): Edge[] {
  // Find incoming and outgoing edges for the deleted node
  const incomingEdges = edges.filter(e => e.target === nodeId);
  const outgoingEdges = edges.filter(e => e.source === nodeId);
  
  // Separate control flow from property input connections
  const isControlFlowEdge = (edge: Edge) => {
    if (!edge.targetHandle) return true; // No handle = control flow
    if (edge.targetHandle === 'driver' || edge.targetHandle === 'input') return true;
    if (edge.targetHandle.startsWith('case-') || edge.targetHandle === 'default') return true;
    return false; // Property input connection
  };
  
  const incomingControlFlow = incomingEdges.filter(isControlFlowEdge);
  const outgoingControlFlow = outgoingEdges.filter(isControlFlowEdge);
  
  // Create new edges: connect each incoming control flow source to each outgoing control flow target
  const newEdges: Edge[] = [];
  let edgeCounter = 0;
  
  // Remove all edges connected to deleted node first
  const remainingEdges = edges.filter(
    e => e.source !== nodeId && e.target !== nodeId
  );
  
  // Helper to check if an edge already exists
  const edgeExists = (source: string, target: string, sourceHandle: string | undefined, targetHandle: string | undefined) => {
    return remainingEdges.some(e => 
      e.source === source && 
      e.target === target && 
      e.sourceHandle === sourceHandle && 
      e.targetHandle === targetHandle
    );
  };
  
  for (const incoming of incomingControlFlow) {
    for (const outgoing of outgoingControlFlow) {
      // Prevent self-connections
      if (incoming.source !== outgoing.target) {
        // Check if edge already exists to prevent duplicates
        if (!edgeExists(incoming.source, outgoing.target, incoming.sourceHandle || undefined, outgoing.targetHandle || undefined)) {
          newEdges.push({
            id: `${incoming.source}-${outgoing.target}-${Date.now()}-${edgeCounter++}-${Math.random().toString(36).substr(2, 9)}`,
            source: incoming.source,
            target: outgoing.target,
            sourceHandle: incoming.sourceHandle,
            targetHandle: outgoing.targetHandle,
          });
        }
      }
    }
  }
  
  return [...remainingEdges, ...newEdges];
}

export function getNodeLabel(type: NodeType | string): string {
  // Check if it's a built-in node type (check if value exists in enum values)
  if (Object.values(NodeType).includes(type as NodeType)) {
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
    return labels[type as NodeType] || type;
  }
  
  // Check if it's a plugin node
  const nodeDef = frontendPluginRegistry.getNodeDefinition(type);
  if (nodeDef) {
    return nodeDef.label;
  }
  
  return type;
}

export function getDefaultNodeData(type: NodeType | string): any {
  // Check if it's a built-in node type (check if value exists in enum values)
  if (Object.values(NodeType).includes(type as NodeType)) {
    const defaults: Record<NodeType, any> = {
      [NodeType.START]: { 
        isTest: true,
        recordSession: false,
        screenshotAllNodes: false,
        screenshotTiming: 'post',
        snapshotAllNodes: false,
        snapshotTiming: 'post',
        slowMo: 0,
        scrollThenAction: false,
      },
      [NodeType.OPEN_BROWSER]: { 
        headless: true, 
        viewportWidth: 1280, 
        viewportHeight: 720,
        maxWindow: true,
        browser: 'chromium',
        stealthMode: false,
        capabilities: {},
        launchOptions: {},
        isTest: true
      },
      [NodeType.ACTION]: { action: 'click', selector: '', selectorType: 'css', timeout: 30000, isTest: true },
      [NodeType.ELEMENT_QUERY]: { action: 'getText', selector: '', selectorType: 'css', timeout: 30000, outputVariable: 'text', isTest: true },
      [NodeType.FORM_INPUT]: { action: 'select', selector: '', selectorType: 'css', timeout: 30000, isTest: true },
      [NodeType.NAVIGATION]: { action: 'navigate', url: '', timeout: 30000, waitUntil: 'networkidle', isTest: true },
      [NodeType.KEYBOARD]: { action: 'press', key: '', timeout: 30000, isTest: true },
      [NodeType.SCROLL]: { action: 'scrollToElement', selector: '', selectorType: 'css', timeout: 30000, isTest: true },
      [NodeType.STORAGE]: { action: 'getCookie', contextKey: 'storageResult', isTest: true },
      [NodeType.DIALOG]: { action: 'accept', timeout: 30000, isTest: true },
      [NodeType.DOWNLOAD]: { action: 'waitForDownload', timeout: 30000, isTest: true },
      [NodeType.IFRAME]: { action: 'switchToIframe', timeout: 30000, isTest: true },
      [NodeType.TYPE]: { selector: '', selectorType: 'css', inputMethod: 'fill', text: '', delay: 0, timeout: 30000, isTest: true },
      [NodeType.SCREENSHOT]: { fullPage: false, isTest: true },
      [NodeType.WAIT]: { waitType: 'timeout', value: 1000, timeout: 30000, isTest: true },
      [NodeType.JAVASCRIPT_CODE]: { code: '// Your code here\nreturn context.data;', isTest: true },
      [NodeType.LOOP]: { arrayVariable: '', isTest: true },
      [NodeType.INT_VALUE]: { value: 0, isTest: true },
      [NodeType.STRING_VALUE]: { value: '', isTest: true },
      [NodeType.BOOLEAN_VALUE]: { value: false, isTest: true },
      [NodeType.INPUT_VALUE]: { dataType: PropertyDataType.STRING, value: '', isTest: true },
      [NodeType.VERIFY]: { domain: 'browser', verificationType: 'url', timeout: 30000, isTest: true },
      [NodeType.API_REQUEST]: { 
        method: 'GET', 
        url: '', 
        headers: {}, 
        bodyType: 'json', 
        timeout: 30000, 
        contextKey: 'apiResponse',
        isTest: true
      },
      [NodeType.API_CURL]: { 
        curlCommand: '', 
        timeout: 30000, 
        contextKey: 'apiResponse',
        isTest: true
      },
      [NodeType.LOAD_CONFIG_FILE]: { isTest: true },
      [NodeType.SELECT_CONFIG_FILE]: { isTest: true },
      [NodeType.DB_CONNECT]: { 
        dbType: 'postgres', 
        connectionKey: 'dbConnection',
        isTest: true 
      },
      [NodeType.DB_DISCONNECT]: { 
        connectionKey: 'dbConnection',
        isTest: true 
      },
      [NodeType.DB_QUERY]: { 
        connectionKey: 'dbConnection',
        queryType: 'sql',
        contextKey: 'dbResult',
        timeout: 30000,
        isTest: true 
      },
      [NodeType.DB_TRANSACTION_BEGIN]: { 
        connectionKey: 'dbConnection',
        isTest: true 
      },
      [NodeType.DB_TRANSACTION_COMMIT]: { 
        connectionKey: 'dbConnection',
        isTest: true 
      },
      [NodeType.DB_TRANSACTION_ROLLBACK]: { 
        connectionKey: 'dbConnection',
        isTest: true 
      },
      [NodeType.CONTEXT_MANIPULATE]: { 
        action: 'setGeolocation',
        isTest: true 
      },
      [NodeType.CSV_HANDLE]: { 
        action: 'write',
        filePath: '',
        dataSource: '',
        contextKey: 'csvData',
        delimiter: ',',
        isTest: true 
      },
    };
    const defaultData = defaults[type as NodeType] || { isTest: true };
    return defaultData;
  }
  
  // Check if it's a plugin node
  const nodeDef = frontendPluginRegistry.getNodeDefinition(type);
  if (nodeDef && nodeDef.defaultData) {
    const defaultData: any = { ...nodeDef.defaultData, isTest: true };
    // Ensure switch node has defaultCase if it's missing
    if (type === 'switch.switch' && (!defaultData.defaultCase || !defaultData.defaultCase.label)) {
      defaultData.defaultCase = { label: 'Default' };
    }
    return defaultData;
  }
  
  // Fallback for switch node if plugin not loaded
  if (type === 'switch.switch') {
    return {
      cases: [
        {
          id: 'case-1',
          label: 'Case 1',
          condition: {
            type: 'ui-element',
            selector: '',
            selectorType: 'css',
            elementCheck: 'visible',
          },
        },
      ],
      defaultCase: { label: 'Default' },
      isTest: true,
    };
  }
  
  return { isTest: true };
}
