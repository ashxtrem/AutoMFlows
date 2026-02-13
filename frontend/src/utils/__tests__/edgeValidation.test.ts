import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidEdge, filterValidEdges, suppressReactFlowWarnings } from '../edgeValidation';
import { Node, Edge } from 'reactflow';

describe('edgeValidation', () => {
  describe('isValidEdge', () => {
    const nodes: Node[] = [
      { id: 'n1', data: {}, position: { x: 0, y: 0 } },
      { id: 'n2', data: {}, position: { x: 100, y: 0 } },
    ];

    it('should return true for valid edge', () => {
      const edge: Edge = { id: 'e1', source: 'n1', target: 'n2' };
      expect(isValidEdge(edge, nodes)).toBe(true);
    });

    it('should return false when source node missing', () => {
      const edge: Edge = { id: 'e1', source: 'missing', target: 'n2' };
      expect(isValidEdge(edge, nodes)).toBe(false);
    });

    it('should return false when target node missing', () => {
      const edge: Edge = { id: 'e1', source: 'n1', target: 'missing' };
      expect(isValidEdge(edge, nodes)).toBe(false);
    });

    it('should return false when both nodes missing', () => {
      const edge: Edge = { id: 'e1', source: 'missing1', target: 'missing2' };
      expect(isValidEdge(edge, nodes)).toBe(false);
    });
  });

  describe('filterValidEdges', () => {
    const nodes: Node[] = [
      { id: 'n1', data: {}, position: { x: 0, y: 0 } },
      { id: 'n2', data: {}, position: { x: 100, y: 0 } },
    ];

    it('should filter out invalid edges', () => {
      const edges: Edge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'missing', target: 'n2' },
        { id: 'e3', source: 'n1', target: 'missing' },
      ];
      const validEdges = filterValidEdges(edges, nodes);
      expect(validEdges.length).toBe(1);
      expect(validEdges[0].id).toBe('e1');
    });

    it('should return all edges when all are valid', () => {
      const edges: Edge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
      ];
      const validEdges = filterValidEdges(edges, nodes);
      expect(validEdges.length).toBe(1);
    });
  });

  describe('suppressReactFlowWarnings', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should suppress React Flow edge warnings', () => {
      const originalWarn = console.warn;
      const mockWarn = vi.fn();
      console.warn = mockWarn;

      suppressReactFlowWarnings();
      console.warn('[React Flow]: Couldn\'t create edge');
      console.warn('Other warning');

      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledWith('Other warning');

      console.warn = originalWarn;
    });
  });
});
