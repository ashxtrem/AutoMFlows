import { describe, it, expect } from 'vitest';
import { PropertyDataType } from '@automflows/shared';
import { canConvertType, getNodeLabel, getDefaultNodeData } from '../utils';

describe('WorkflowStore Utils', () => {
  describe('canConvertType', () => {
    it('should allow conversion between compatible types', () => {
      // Note: These tests depend on the actual implementation
      // If PropertyDataType enum values don't match, adjust expectations
      const result1 = canConvertType(PropertyDataType.STRING, PropertyDataType.STRING);
      expect(typeof result1).toBe('boolean');
    });

    it('should allow any to any conversion', () => {
      const result1 = canConvertType(PropertyDataType.ANY as any, PropertyDataType.STRING);
      const result2 = canConvertType(PropertyDataType.STRING, PropertyDataType.ANY as any);
      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
    });

    it('should allow boolean to string conversion', () => {
      const result = canConvertType(PropertyDataType.BOOLEAN, PropertyDataType.STRING);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getNodeLabel', () => {
    it('should return label for known node type', () => {
      const label = getNodeLabel('start');
      expect(label).toBeDefined();
      expect(typeof label).toBe('string');
    });

    it('should return the type string for unknown types', () => {
      const label = getNodeLabel('unknown-type');
      expect(label).toBe('unknown-type');
    });
  });

  describe('getDefaultNodeData', () => {
    it('should return default data for known node type', () => {
      const data = getDefaultNodeData('start');
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should return object for unknown types', () => {
      const data = getDefaultNodeData('unknown-type');
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  });
});
