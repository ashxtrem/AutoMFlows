import { NodeType, PropertyDataType } from '@automflows/shared';

/**
 * Property schema definition for node properties
 */
export interface PropertySchema {
  name: string;
  label: string;
  dataType: PropertyDataType;
  required: boolean;
  defaultValue?: any;
}

/**
 * Get all properties for a node type
 * Returns array of property schemas with their metadata
 */
export function getNodeProperties(nodeType: NodeType | string): PropertySchema[] {
  // Normalize nodeType to handle both enum and string values
  const normalizedType = typeof nodeType === 'string' 
    ? (Object.values(NodeType).find(v => v === nodeType) || nodeType)
    : nodeType;

  if (Object.values(NodeType).includes(normalizedType as NodeType)) {
    switch (normalizedType as NodeType) {
      case NodeType.NAVIGATION:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'navigate' },
          { name: 'url', label: 'URL', dataType: PropertyDataType.STRING, required: false },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'waitUntil', label: 'Wait Until', dataType: PropertyDataType.STRING, required: false, defaultValue: 'networkidle' },
          { name: 'referer', label: 'Referer', dataType: PropertyDataType.STRING, required: false },
          { name: 'tabIndex', label: 'Tab Index', dataType: PropertyDataType.INT, required: false },
          { name: 'urlPattern', label: 'URL Pattern', dataType: PropertyDataType.STRING, required: false },
          { name: 'contextKey', label: 'Context Key', dataType: PropertyDataType.STRING, required: false },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.KEYBOARD:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'press' },
          { name: 'key', label: 'Key', dataType: PropertyDataType.STRING, required: false },
          { name: 'text', label: 'Text', dataType: PropertyDataType.STRING, required: false },
          { name: 'shortcut', label: 'Shortcut', dataType: PropertyDataType.STRING, required: false },
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: false },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'delay', label: 'Delay', dataType: PropertyDataType.INT, required: false },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.SCROLL:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'scrollToElement' },
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: false },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'x', label: 'X', dataType: PropertyDataType.INT, required: false },
          { name: 'y', label: 'Y', dataType: PropertyDataType.INT, required: false },
          { name: 'deltaX', label: 'Delta X', dataType: PropertyDataType.INT, required: false },
          { name: 'deltaY', label: 'Delta Y', dataType: PropertyDataType.INT, required: false },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.STORAGE:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'getCookie' },
          { name: 'contextKey', label: 'Context Key', dataType: PropertyDataType.STRING, required: false, defaultValue: 'storageResult' },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.DIALOG:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'accept' },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.DOWNLOAD:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'waitForDownload' },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.IFRAME:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'switchToIframe' },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.ACTION:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'click' },
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: true },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'targetSelector', label: 'Target Selector', dataType: PropertyDataType.STRING, required: false },
          { name: 'targetSelectorType', label: 'Target Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'targetX', label: 'Target X', dataType: PropertyDataType.INT, required: false },
          { name: 'targetY', label: 'Target Y', dataType: PropertyDataType.INT, required: false },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.ELEMENT_QUERY:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'getText' },
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: true },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'outputVariable', label: 'Output Variable', dataType: PropertyDataType.STRING, required: false, defaultValue: 'text' },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.FORM_INPUT:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'select' },
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: true },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.TYPE:
        return [
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: true },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'inputMethod', label: 'Input Method', dataType: PropertyDataType.STRING, required: false, defaultValue: 'fill' },
          { name: 'text', label: 'Text', dataType: PropertyDataType.STRING, required: true },
          { name: 'delay', label: 'Delay', dataType: PropertyDataType.INT, required: false, defaultValue: 0 },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.WAIT:
        return [
          { name: 'waitType', label: 'Wait Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'timeout' },
          { name: 'value', label: 'Value', dataType: PropertyDataType.STRING, required: true }, // Can be int or string
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.OPEN_BROWSER:
        return [
          { name: 'browser', label: 'Browser', dataType: PropertyDataType.STRING, required: false, defaultValue: 'chromium' },
          { name: 'maxWindow', label: 'Max Window', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: true },
          { name: 'headless', label: 'Headless', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: true },
          { name: 'viewportWidth', label: 'Viewport Width', dataType: PropertyDataType.INT, required: false, defaultValue: 1280 },
          { name: 'viewportHeight', label: 'Viewport Height', dataType: PropertyDataType.INT, required: false, defaultValue: 720 },
          { name: 'stealthMode', label: 'Stealth Mode', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
          // Note: 'capabilities' and 'jsScript' are NOT included here - they're managed via button/popup and cannot be converted to input
        ];
      
      case NodeType.SCREENSHOT:
        return [
          { name: 'fullPage', label: 'Full Page', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
          { name: 'path', label: 'Path', dataType: PropertyDataType.STRING, required: false },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.JAVASCRIPT_CODE:
        return [
          { name: 'code', label: 'Code', dataType: PropertyDataType.STRING, required: true },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.LOOP:
        return [
          { name: 'arrayVariable', label: 'Array Variable', dataType: PropertyDataType.STRING, required: true },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.VERIFY:
        return [
          { name: 'domain', label: 'Domain', dataType: PropertyDataType.STRING, required: true, defaultValue: 'browser' },
          { name: 'verificationType', label: 'Verification Type', dataType: PropertyDataType.STRING, required: true },
          { name: 'urlPattern', label: 'URL Pattern', dataType: PropertyDataType.STRING, required: false },
          { name: 'expectedText', label: 'Expected Text', dataType: PropertyDataType.STRING, required: false },
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: false },
          { name: 'expectedValue', label: 'Expected Value', dataType: PropertyDataType.STRING, required: false },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.API_REQUEST:
        return [
          { name: 'method', label: 'Method', dataType: PropertyDataType.STRING, required: false, defaultValue: 'GET' },
          { name: 'url', label: 'URL', dataType: PropertyDataType.STRING, required: true },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'contextKey', label: 'Context Key', dataType: PropertyDataType.STRING, required: false, defaultValue: 'apiResponse' },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.API_CURL:
        return [
          { name: 'curlCommand', label: 'cURL Command', dataType: PropertyDataType.STRING, required: true },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'contextKey', label: 'Context Key', dataType: PropertyDataType.STRING, required: false, defaultValue: 'apiResponse' },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.DB_CONNECT:
        return [
          { name: 'dbType', label: 'DB Type', dataType: PropertyDataType.STRING, required: true, defaultValue: 'postgres' },
          { name: 'connectionKey', label: 'Connection Key', dataType: PropertyDataType.STRING, required: false, defaultValue: 'dbConnection' },
          { name: 'configKey', label: 'Config Key', dataType: PropertyDataType.STRING, required: false },
          { name: 'host', label: 'Host', dataType: PropertyDataType.STRING, required: false },
          { name: 'server', label: 'Server', dataType: PropertyDataType.STRING, required: false },
          { name: 'port', label: 'Port', dataType: PropertyDataType.INT, required: false },
          { name: 'user', label: 'User', dataType: PropertyDataType.STRING, required: false },
          { name: 'password', label: 'Password', dataType: PropertyDataType.STRING, required: false },
          { name: 'database', label: 'Database', dataType: PropertyDataType.STRING, required: false },
          { name: 'connectionString', label: 'Connection String', dataType: PropertyDataType.STRING, required: false },
          { name: 'filePath', label: 'File Path', dataType: PropertyDataType.STRING, required: false },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.DB_DISCONNECT:
        return [
          { name: 'connectionKey', label: 'Connection Key', dataType: PropertyDataType.STRING, required: false, defaultValue: 'dbConnection' },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.DB_QUERY:
        return [
          { name: 'connectionKey', label: 'Connection Key', dataType: PropertyDataType.STRING, required: false, defaultValue: 'dbConnection' },
          { name: 'queryType', label: 'Query Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'sql' },
          { name: 'query', label: 'Query', dataType: PropertyDataType.STRING, required: false },
          { name: 'queryKey', label: 'Query Key', dataType: PropertyDataType.STRING, required: false },
          { name: 'contextKey', label: 'Context Key', dataType: PropertyDataType.STRING, required: false, defaultValue: 'dbResult' },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.DB_TRANSACTION_BEGIN:
      case NodeType.DB_TRANSACTION_COMMIT:
      case NodeType.DB_TRANSACTION_ROLLBACK:
        return [
          { name: 'connectionKey', label: 'Connection Key', dataType: PropertyDataType.STRING, required: false, defaultValue: 'dbConnection' },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.START:
        return [
          { name: 'recordSession', label: 'Record Session', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
          { name: 'screenshotAllNodes', label: 'Screenshot All Nodes', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
          { name: 'screenshotTiming', label: 'Screenshot Timing', dataType: PropertyDataType.STRING, required: false, defaultValue: 'post' },
          { name: 'snapshotAllNodes', label: 'Accessibility Snapshot All Nodes', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
          { name: 'snapshotTiming', label: 'Snapshot Timing', dataType: PropertyDataType.STRING, required: false, defaultValue: 'post' },
        ];
      
      case NodeType.CONTEXT_MANIPULATE:
        return [
          { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'setGeolocation' },
          { name: 'contextKey', label: 'Context Key', dataType: PropertyDataType.STRING, required: false },
          { name: 'stateFilePath', label: 'State File Path', dataType: PropertyDataType.STRING, required: false },
          { name: 'device', label: 'Device', dataType: PropertyDataType.STRING, required: false },
          { name: 'viewportWidth', label: 'Viewport Width', dataType: PropertyDataType.INT, required: false },
          { name: 'viewportHeight', label: 'Viewport Height', dataType: PropertyDataType.INT, required: false },
          { name: 'userAgent', label: 'User Agent', dataType: PropertyDataType.STRING, required: false },
          { name: 'locale', label: 'Locale', dataType: PropertyDataType.STRING, required: false },
          { name: 'timezoneId', label: 'Timezone ID', dataType: PropertyDataType.STRING, required: false },
          { name: 'colorScheme', label: 'Color Scheme', dataType: PropertyDataType.STRING, required: false },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
          // Note: Complex properties like geolocation, permissions, extraHTTPHeaders, contextOptions, initScript
          // are NOT included here as they're JSON objects/arrays managed via textarea editors
        ];
      
      case NodeType.INT_VALUE:
      case NodeType.STRING_VALUE:
      case NodeType.BOOLEAN_VALUE:
        // These nodes don't have properties that can be converted to inputs
        return [];
      
      default:
        return [];
    }
  }
  
  // Fallback: Check if it's a string match for CONTEXT_MANIPULATE
  // This handles cases where the node type might be stored as a string
  if (nodeType === 'contextManipulate' || nodeType === NodeType.CONTEXT_MANIPULATE) {
    return [
      { name: 'action', label: 'Action', dataType: PropertyDataType.STRING, required: true, defaultValue: 'setGeolocation' },
      { name: 'contextKey', label: 'Context Key', dataType: PropertyDataType.STRING, required: false },
      { name: 'stateFilePath', label: 'State File Path', dataType: PropertyDataType.STRING, required: false },
      { name: 'device', label: 'Device', dataType: PropertyDataType.STRING, required: false },
      { name: 'viewportWidth', label: 'Viewport Width', dataType: PropertyDataType.INT, required: false },
      { name: 'viewportHeight', label: 'Viewport Height', dataType: PropertyDataType.INT, required: false },
      { name: 'userAgent', label: 'User Agent', dataType: PropertyDataType.STRING, required: false },
      { name: 'locale', label: 'Locale', dataType: PropertyDataType.STRING, required: false },
      { name: 'timezoneId', label: 'Timezone ID', dataType: PropertyDataType.STRING, required: false },
      { name: 'colorScheme', label: 'Color Scheme', dataType: PropertyDataType.STRING, required: false },
      { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
    ];
  }
  
  // For plugin nodes, we'd need to check plugin registry
  // For now, return empty array
  return [];
}

/**
 * Check if a property is converted to an input connection
 */
export function isPropertyInputConnection(nodeData: any, propertyName: string): boolean {
  return nodeData._inputConnections?.[propertyName]?.isInput === true;
}

/**
 * Get the old value for a property that was converted to input
 * Returns undefined if property is not converted to input or has no old value stored
 */
export function getPropertyOldValue(nodeData: any, propertyName: string): any {
  return nodeData._inputConnections?.[propertyName]?.oldValue;
}

/**
 * Get the input handle ID for a property
 */
export function getPropertyInputHandleId(propertyName: string): string {
  return `${propertyName}-input`;
}

