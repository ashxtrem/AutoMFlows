import { extractWorkflowName, isUINode, extractSelectorInfo } from '../utils';
import { BaseNode, NodeType } from '@automflows/shared';

describe('executor utils', () => {
  describe('extractWorkflowName', () => {
    it('should use workflowFileName if provided', () => {
      const workflow = { nodes: [], edges: [] };
      const name = extractWorkflowName(workflow, 'custom-name');
      expect(name).toBe('custom-name');
    });

    it('should use Start node label if available', () => {
      const workflow = {
        nodes: [
          {
            id: 'start-1',
            type: NodeType.START,
            position: { x: 0, y: 0 },
            data: { label: 'My Workflow' },
          },
        ],
        edges: [],
      };
      const name = extractWorkflowName(workflow);
      expect(name).toBe('my-workflow');
    });

    it('should sanitize Start node label', () => {
      const workflow = {
        nodes: [
          {
            id: 'start-1',
            type: NodeType.START,
            position: { x: 0, y: 0 },
            data: { label: 'Test Workflow 123!' },
          },
        ],
        edges: [],
      };
      const name = extractWorkflowName(workflow);
      expect(name).toBe('test-workflow-123-');
    });

    it('should return default if no Start node', () => {
      const workflow = { nodes: [], edges: [] };
      const name = extractWorkflowName(workflow);
      expect(name).toBe('workflow');
    });
  });

  describe('isUINode', () => {
    it('should return true for ACTION node', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(isUINode(node)).toBe(true);
    });

    it('should return true for TYPE node', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.TYPE,
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(isUINode(node)).toBe(true);
    });

    it('should return true for ELEMENT_QUERY node', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ELEMENT_QUERY,
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(isUINode(node)).toBe(true);
    });

    it('should return true for SCREENSHOT node', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.SCREENSHOT,
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(isUINode(node)).toBe(true);
    });

    it('should return true for NAVIGATION node with waitForSelector', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.NAVIGATION,
        position: { x: 0, y: 0 },
        data: { waitForSelector: '#test' },
      };
      expect(isUINode(node)).toBe(true);
    });

    it('should return false for NAVIGATION node without waitForSelector', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.NAVIGATION,
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(isUINode(node)).toBe(false);
    });

    it('should return true for WAIT node with selector waitType', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.WAIT,
        position: { x: 0, y: 0 },
        data: { waitType: 'selector' },
      };
      expect(isUINode(node)).toBe(true);
    });

    it('should return true for plugin node with selector', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: 'plugin.test' as any,
        position: { x: 0, y: 0 },
        data: { selector: '#test' },
      };
      expect(isUINode(node)).toBe(true);
    });

    it('should return false for non-UI node', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.START,
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(isUINode(node)).toBe(false);
    });
  });

  describe('extractSelectorInfo', () => {
    it('should extract selector from ACTION node', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: { selector: '#button', selectorType: 'css' },
      };
      const info = extractSelectorInfo(node);
      expect(info).toEqual({ selector: '#button', selectorType: 'css' });
    });

    it('should default to css if selectorType not provided', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: { selector: '#button' },
      };
      const info = extractSelectorInfo(node);
      expect(info).toEqual({ selector: '#button', selectorType: 'css' });
    });

    it('should extract selector from NAVIGATION node with waitForSelector', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.NAVIGATION,
        position: { x: 0, y: 0 },
        data: { waitForSelector: '//div', waitForSelectorType: 'xpath' },
      };
      const info = extractSelectorInfo(node);
      expect(info).toEqual({ selector: '//div', selectorType: 'xpath' });
    });

    it('should extract selector from WAIT node with selector waitType', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.WAIT,
        position: { x: 0, y: 0 },
        data: { waitType: 'selector', value: '#test', selectorType: 'css' },
      };
      const info = extractSelectorInfo(node);
      expect(info).toEqual({ selector: '#test', selectorType: 'css' });
    });

    it('should extract selector from plugin node', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: 'plugin.test' as any,
        position: { x: 0, y: 0 },
        data: { selector: '#plugin', selectorType: 'xpath' },
      };
      const info = extractSelectorInfo(node);
      expect(info).toEqual({ selector: '#plugin', selectorType: 'xpath' });
    });

    it('should return empty object for node without selector', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.START,
        position: { x: 0, y: 0 },
        data: {},
      };
      const info = extractSelectorInfo(node);
      expect(info).toEqual({});
    });
  });
});
