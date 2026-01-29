import { NodeType, RecordedAction } from '@automflows/shared';

/**
 * Auto-detect node type from recorded action
 */
export function detectNodeType(action: RecordedAction): NodeType {
  switch (action.type) {
    case 'click':
      return NodeType.ACTION;
    case 'type':
      return NodeType.TYPE;
    case 'keyboard':
      return NodeType.KEYBOARD;
    case 'form-input':
      return NodeType.FORM_INPUT;
    case 'navigation':
      return NodeType.NAVIGATION;
    case 'scroll':
      return NodeType.SCROLL;
    case 'hover':
      return NodeType.ACTION;
    default:
      return NodeType.ACTION; // Default fallback
  }
}

/**
 * Get default node data based on action type
 */
export function getDefaultNodeDataFromAction(action: RecordedAction, detectedType: NodeType): any {
  const baseData: any = {
    isTest: true,
    timeout: 30000,
  };

  switch (detectedType) {
    case NodeType.ACTION:
      return {
        ...baseData,
        action: action.type === 'hover' ? 'hover' : 'click',
        selector: action.selector || '',
        selectorType: action.selectorType || 'css',
      };
    
    case NodeType.TYPE:
      return {
        ...baseData,
        selector: action.selector || '',
        selectorType: action.selectorType || 'css',
        inputMethod: 'fill',
        text: action.value || '',
      };
    
    case NodeType.KEYBOARD:
      return {
        ...baseData,
        action: action.key ? 'press' : 'type',
        key: action.key || '',
        text: action.value || '',
        selector: action.selector || '',
        selectorType: action.selectorType || 'css',
      };
    
    case NodeType.FORM_INPUT:
      return {
        ...baseData,
        action: 'select',
        selector: action.selector || '',
        selectorType: action.selectorType || 'css',
        value: action.value || '',
      };
    
    case NodeType.NAVIGATION:
      return {
        ...baseData,
        action: 'navigate',
        url: action.url || '',
        waitUntil: 'networkidle',
      };
    
    case NodeType.SCROLL:
      return {
        ...baseData,
        action: 'scrollToElement',
        selector: action.selector || '',
        selectorType: action.selectorType || 'css',
      };
    
    default:
      return baseData;
  }
}
