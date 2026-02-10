import { describe, it, expect } from 'vitest';
import { NodeType } from '@automflows/shared';
import { getNodeLabel } from '../labels';

describe('CustomNode Labels', () => {
  describe('getNodeLabel', () => {
    it('should return correct label for START node', () => {
      expect(getNodeLabel(NodeType.START)).toBe('Start');
    });

    it('should return correct label for OPEN_BROWSER node', () => {
      expect(getNodeLabel(NodeType.OPEN_BROWSER)).toBe('Open Browser');
    });

    it('should return correct label for all NodeType values', () => {
      const expectedLabels: Record<NodeType, string> = {
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
        [NodeType.CONTEXT_MANIPULATE]: 'Context Manipulate',
      };

      Object.entries(expectedLabels).forEach(([nodeType, expectedLabel]) => {
        expect(getNodeLabel(nodeType as NodeType)).toBe(expectedLabel);
      });
    });

    it('should return the type string for unknown types', () => {
      expect(getNodeLabel('unknown-type')).toBe('unknown-type');
    });
  });
});
