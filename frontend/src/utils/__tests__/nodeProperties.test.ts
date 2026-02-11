import { describe, it, expect } from 'vitest';
import { NodeType } from '@automflows/shared';
import { getNodeProperties, isPropertyInputConnection, getPropertyInputHandleId } from '../nodeProperties';

describe('nodeProperties', () => {
  describe('getNodeProperties', () => {
    it('should return properties for NAVIGATION node type', () => {
      const properties = getNodeProperties(NodeType.NAVIGATION);
      expect(properties.length).toBeGreaterThan(0);
      expect(properties.some(p => p.name === 'action')).toBe(true);
    });

    it('should return properties for ACTION node type', () => {
      const properties = getNodeProperties(NodeType.ACTION);
      expect(properties.length).toBeGreaterThan(0);
      expect(properties.some(p => p.name === 'selector')).toBe(true);
    });

    it('should return properties for KEYBOARD node type', () => {
      const properties = getNodeProperties(NodeType.KEYBOARD);
      expect(properties.length).toBeGreaterThan(0);
    });

    it('should handle string node types', () => {
      const properties = getNodeProperties('action');
      expect(Array.isArray(properties)).toBe(true);
    });
  });

  describe('isPropertyInputConnection', () => {
    it('should identify property input connections', () => {
      const nodeDataWithInput = {
        _inputConnections: {
          timeout: { isInput: true, handleId: 'timeout-input' },
        },
      };
      const nodeDataWithoutInput = {
        timeout: 5000,
      };
      expect(isPropertyInputConnection(nodeDataWithInput, 'timeout')).toBe(true);
      expect(isPropertyInputConnection(nodeDataWithoutInput, 'timeout')).toBe(false);
    });
  });

  describe('getPropertyInputHandleId', () => {
    it('should generate property input handle ID', () => {
      expect(getPropertyInputHandleId('timeout')).toBe('timeout-input');
      expect(getPropertyInputHandleId('selector')).toBe('selector-input');
    });
  });
});
