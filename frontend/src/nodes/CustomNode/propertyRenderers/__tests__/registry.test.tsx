import { describe, it, expect } from 'vitest';
import { NodeType } from '@automflows/shared';
import { getPropertyRenderer, propertyRendererRegistry } from '../registry';

describe('Property Renderer Registry', () => {
  describe('propertyRendererRegistry', () => {
    it('should have renderer for START node type', () => {
      expect(propertyRendererRegistry[NodeType.START]).toBeDefined();
      expect(typeof propertyRendererRegistry[NodeType.START]).toBe('function');
    });

    it('should have renderer for ACTION node type', () => {
      expect(propertyRendererRegistry[NodeType.ACTION]).toBeDefined();
      expect(typeof propertyRendererRegistry[NodeType.ACTION]).toBe('function');
    });

    it('should have renderer for ELEMENT_QUERY node type', () => {
      expect(propertyRendererRegistry[NodeType.ELEMENT_QUERY]).toBeDefined();
      expect(typeof propertyRendererRegistry[NodeType.ELEMENT_QUERY]).toBe('function');
    });

    it('should have renderer for all standard node types', () => {
      const standardNodeTypes = [
        NodeType.START,
        NodeType.ACTION,
        NodeType.ELEMENT_QUERY,
        NodeType.FORM_INPUT,
        NodeType.NAVIGATION,
        NodeType.KEYBOARD,
        NodeType.SCROLL,
        NodeType.TYPE,
        NodeType.SCREENSHOT,
        NodeType.STORAGE,
        NodeType.DIALOG,
        NodeType.DOWNLOAD,
        NodeType.IFRAME,
        NodeType.WAIT,
        NodeType.CONTEXT_MANIPULATE,
        NodeType.JAVASCRIPT_CODE,
        NodeType.LOOP,
        NodeType.OPEN_BROWSER,
        NodeType.INT_VALUE,
        NodeType.STRING_VALUE,
        NodeType.BOOLEAN_VALUE,
        NodeType.INPUT_VALUE,
        NodeType.API_REQUEST,
        NodeType.API_CURL,
        NodeType.LOAD_CONFIG_FILE,
        NodeType.SELECT_CONFIG_FILE,
        NodeType.DB_CONNECT,
        NodeType.DB_DISCONNECT,
        NodeType.DB_QUERY,
      ];

      standardNodeTypes.forEach((nodeType) => {
        expect(propertyRendererRegistry[nodeType]).toBeDefined();
        expect(typeof propertyRendererRegistry[nodeType]).toBe('function');
      });
    });

    it('should use same renderer for LOAD_CONFIG_FILE and SELECT_CONFIG_FILE', () => {
      expect(propertyRendererRegistry[NodeType.LOAD_CONFIG_FILE]).toBe(
        propertyRendererRegistry[NodeType.SELECT_CONFIG_FILE]
      );
    });
  });

  describe('getPropertyRenderer', () => {
    it('should return renderer for standard node type', () => {
      const renderer = getPropertyRenderer(NodeType.START);
      expect(renderer).toBeDefined();
      expect(typeof renderer).toBe('function');
    });

    it('should return renderer for ACTION node type', () => {
      const renderer = getPropertyRenderer(NodeType.ACTION);
      expect(renderer).toBeDefined();
      expect(typeof renderer).toBe('function');
    });

    it('should return plugin renderer for plugin node type', () => {
      const renderer = getPropertyRenderer('plugin.test');
      expect(renderer).toBeDefined();
      expect(typeof renderer).toBe('function');
    });

    it('should return null for unknown node type', () => {
      const renderer = getPropertyRenderer('unknown-type');
      expect(renderer).toBeNull();
    });

    it('should return null for empty string', () => {
      const renderer = getPropertyRenderer('');
      expect(renderer).toBeNull();
    });

    it('should handle plugin node types with dots', () => {
      const renderer = getPropertyRenderer('custom.plugin.node');
      expect(renderer).toBeDefined();
      expect(typeof renderer).toBe('function');
    });
  });
});
