import { describe, it, expect } from 'vitest';
import { NodeType } from '@automflows/shared';
import { detectNodeType, getDefaultNodeDataFromAction } from '../nodeTypeDetector';
import { RecordedAction } from '@automflows/shared';

describe('nodeTypeDetector', () => {
  describe('detectNodeType', () => {
    it('should detect ACTION node type for click action', () => {
      const action: RecordedAction = { type: 'click', selector: '.btn' } as any;
      expect(detectNodeType(action)).toBe(NodeType.ACTION);
    });

    it('should detect TYPE node type for type action', () => {
      const action: RecordedAction = { type: 'type', selector: '.input' } as any;
      expect(detectNodeType(action)).toBe(NodeType.TYPE);
    });

    it('should detect KEYBOARD node type for keyboard action', () => {
      const action: RecordedAction = { type: 'keyboard', key: 'Enter' } as any;
      expect(detectNodeType(action)).toBe(NodeType.KEYBOARD);
    });

    it('should detect FORM_INPUT node type for form-input action', () => {
      const action: RecordedAction = { type: 'form-input', selector: '.select' } as any;
      expect(detectNodeType(action)).toBe(NodeType.FORM_INPUT);
    });

    it('should detect NAVIGATION node type for navigation action', () => {
      const action: RecordedAction = { type: 'navigation', url: 'https://example.com' } as any;
      expect(detectNodeType(action)).toBe(NodeType.NAVIGATION);
    });

    it('should default to ACTION for unknown types', () => {
      const action: RecordedAction = { type: 'unknown' as any } as any;
      expect(detectNodeType(action)).toBe(NodeType.ACTION);
    });
  });

  describe('getDefaultNodeDataFromAction', () => {
    it('should generate default data for ACTION node', () => {
      const action: RecordedAction = { type: 'click', selector: '.btn' } as any;
      const data = getDefaultNodeDataFromAction(action, NodeType.ACTION);
      expect(data.action).toBe('click');
      expect(data.selector).toBe('.btn');
    });

    it('should generate default data for TYPE node', () => {
      const action: RecordedAction = { type: 'type', selector: '.input', value: 'test' } as any;
      const data = getDefaultNodeDataFromAction(action, NodeType.TYPE);
      expect(data.text).toBe('test');
    });
  });
});
