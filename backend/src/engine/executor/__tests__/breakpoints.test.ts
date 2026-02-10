import { shouldTriggerBreakpoint } from '../breakpoints';
import { BaseNode, BreakpointConfig, NodeType } from '@automflows/shared';

describe('breakpoints', () => {
  describe('shouldTriggerBreakpoint', () => {
    it('should return false if breakpointConfig is undefined', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(shouldTriggerBreakpoint(node, 'pre', undefined)).toBe(false);
    });

    it('should return false if breakpointConfig is disabled', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: {},
      };
      const config: BreakpointConfig = {
        enabled: false,
        breakpointAt: 'pre',
        breakpointFor: 'all',
      };
      expect(shouldTriggerBreakpoint(node, 'pre', config)).toBe(false);
    });

    it('should return true if breakpointFor is "all" and timing matches', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: {},
      };
      const config: BreakpointConfig = {
        enabled: true,
        breakpointAt: 'pre',
        breakpointFor: 'all',
      };
      expect(shouldTriggerBreakpoint(node, 'pre', config)).toBe(true);
    });

    it('should return false if timing does not match', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: {},
      };
      const config: BreakpointConfig = {
        enabled: true,
        breakpointAt: 'pre',
        breakpointFor: 'all',
      };
      expect(shouldTriggerBreakpoint(node, 'post', config)).toBe(false);
    });

    it('should return true if breakpointAt is "both"', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: {},
      };
      const config: BreakpointConfig = {
        enabled: true,
        breakpointAt: 'both',
        breakpointFor: 'all',
      };
      expect(shouldTriggerBreakpoint(node, 'pre', config)).toBe(true);
      expect(shouldTriggerBreakpoint(node, 'post', config)).toBe(true);
    });

    it('should return true if breakpointFor is "marked" and node has breakpoint', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: { breakpoint: true },
      };
      const config: BreakpointConfig = {
        enabled: true,
        breakpointAt: 'pre',
        breakpointFor: 'marked',
      };
      expect(shouldTriggerBreakpoint(node, 'pre', config)).toBe(true);
    });

    it('should return false if breakpointFor is "marked" and node does not have breakpoint', () => {
      const node: BaseNode = {
        id: 'node-1',
        type: NodeType.ACTION,
        position: { x: 0, y: 0 },
        data: {},
      };
      const config: BreakpointConfig = {
        enabled: true,
        breakpointAt: 'pre',
        breakpointFor: 'marked',
      };
      expect(shouldTriggerBreakpoint(node, 'pre', config)).toBe(false);
    });
  });
});
