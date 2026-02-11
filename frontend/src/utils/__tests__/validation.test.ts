import { describe, it, expect } from 'vitest';
import { NodeType } from '@automflows/shared';
import { validateInputConnections } from '../validation';
import { Node, Edge } from 'reactflow';

describe('validation', () => {
  describe('validateInputConnections', () => {
    it('should return empty array when all inputs are connected', () => {
      const nodes: Node[] = [
        {
          id: 'n1',
          data: {
            type: NodeType.ACTION,
            timeout: null,
            _inputConnections: { timeout: { isInput: true, handleId: 'timeout-input' } },
          },
          position: { x: 0, y: 0 },
        },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'n2', target: 'n1', targetHandle: 'timeout-input' },
      ];
      const errors = validateInputConnections(nodes, edges);
      expect(errors.length).toBe(0);
    });

    it('should detect unconnected input properties', () => {
      const nodes: Node[] = [
        {
          id: 'n1',
          data: {
            type: NodeType.ACTION,
            timeout: null,
            _inputConnections: { timeout: { isInput: true, handleId: 'timeout-input' } },
          },
          position: { x: 0, y: 0 },
        },
      ];
      const edges: Edge[] = [];
      const errors = validateInputConnections(nodes, edges);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
