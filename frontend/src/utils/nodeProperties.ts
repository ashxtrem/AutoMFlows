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
  const properties: PropertySchema[] = [];

  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    switch (nodeType as NodeType) {
      case NodeType.NAVIGATE:
        return [
          { name: 'url', label: 'URL', dataType: PropertyDataType.STRING, required: true },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'waitUntil', label: 'Wait Until', dataType: PropertyDataType.STRING, required: false, defaultValue: 'networkidle' },
          { name: 'referer', label: 'Referer', dataType: PropertyDataType.STRING, required: false },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.CLICK:
        return [
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: true },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.TYPE:
        return [
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: true },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'text', label: 'Text', dataType: PropertyDataType.STRING, required: true },
          { name: 'timeout', label: 'Timeout', dataType: PropertyDataType.INT, required: false, defaultValue: 30000 },
          { name: 'failSilently', label: 'Fail Silently', dataType: PropertyDataType.BOOLEAN, required: false, defaultValue: false },
        ];
      
      case NodeType.GET_TEXT:
        return [
          { name: 'selector', label: 'Selector', dataType: PropertyDataType.STRING, required: true },
          { name: 'selectorType', label: 'Selector Type', dataType: PropertyDataType.STRING, required: false, defaultValue: 'css' },
          { name: 'outputVariable', label: 'Output Variable', dataType: PropertyDataType.STRING, required: false, defaultValue: 'text' },
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
          { name: 'userAgent', label: 'User Agent', dataType: PropertyDataType.STRING, required: false },
          // Note: 'capabilities' is NOT included here - it's managed via button/popup and cannot be converted to input
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
      
      case NodeType.START:
      case NodeType.INT_VALUE:
      case NodeType.STRING_VALUE:
      case NodeType.BOOLEAN_VALUE:
        // These nodes don't have properties that can be converted to inputs
        return [];
      
      default:
        return [];
    }
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
 * Get the input handle ID for a property
 */
export function getPropertyInputHandleId(propertyName: string): string {
  return `${propertyName}-input`;
}

