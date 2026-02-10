import { describe, it, expect } from 'vitest';
import { NodeType } from '@automflows/shared';
import { getNodeIcon, getNodeGlowColor, hexToRgba, nodeIcons } from '../icons';

describe('CustomNode Icons', () => {
  describe('getNodeIcon', () => {
    it('should return icon config for valid NodeType', () => {
      const result = getNodeIcon(NodeType.START);
      expect(result).not.toBeNull();
      expect(result?.icon).toBeDefined();
      expect(result?.color).toBe('#4CAF50');
    });

    it('should return EditIcon for setConfig.setConfig', () => {
      const result = getNodeIcon('setConfig.setConfig');
      expect(result).not.toBeNull();
      expect(result?.color).toBe('#FF9800');
    });

    it('should return default icon for unknown node type', () => {
      const result = getNodeIcon('unknown-type');
      expect(result).not.toBeNull();
      expect(result?.color).toBe('#757575');
    });
  });

  describe('hexToRgba', () => {
    it('should convert hex to rgba correctly', () => {
      const result = hexToRgba('#4CAF50', 0.5);
      expect(result).toBe('rgba(76, 175, 80, 0.5)');
    });

    it('should handle hex without # prefix', () => {
      const result = hexToRgba('4CAF50', 0.5);
      expect(result).toBe('rgba(76, 175, 80, 0.5)');
    });

    it('should use default alpha of 0.5', () => {
      const result = hexToRgba('#FF0000');
      expect(result).toBe('rgba(255, 0, 0, 0.5)');
    });
  });

  describe('getNodeGlowColor', () => {
    it('should use user backgroundColor when provided', () => {
      const result = getNodeGlowColor(NodeType.START, '#FF0000');
      expect(result).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should fall back to node type color when no user color', () => {
      const result = getNodeGlowColor(NodeType.START);
      expect(result).toBe('rgba(76, 175, 80, 0.5)');
    });

    it('should ignore default backgroundColor', () => {
      const result = getNodeGlowColor(NodeType.START, '#1f2937');
      // Should use node type color, not the default
      expect(result).toBe('rgba(76, 175, 80, 0.5)');
    });
  });

  describe('nodeIcons', () => {
    it('should have icons for all NodeType values', () => {
      Object.values(NodeType).forEach((nodeType) => {
        expect(nodeIcons[nodeType]).toBeDefined();
        expect(nodeIcons[nodeType].icon).toBeDefined();
        expect(nodeIcons[nodeType].color).toBeDefined();
      });
    });
  });
});
