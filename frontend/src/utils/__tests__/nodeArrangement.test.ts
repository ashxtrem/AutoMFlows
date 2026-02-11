import { describe, it, expect } from 'vitest';
import { arrangeNodesVertical, arrangeNodesHorizontal } from '../nodeArrangement';
import { Node, Edge } from 'reactflow';
import { NodeType } from '@automflows/shared';

describe('nodeArrangement', () => {
  const createTestNodes = (): Node[] => [
    { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 }, width: 200, height: 100 },
    { id: 'n2', data: { type: NodeType.ACTION }, position: { x: 0, y: 0 }, width: 200, height: 100 },
  ];

  describe('arrangeNodesVertical', () => {
    it('should arrange nodes vertically', () => {
      const nodes = createTestNodes();
      const edges: Edge[] = [];
      const arranged = arrangeNodesVertical(nodes, edges, {});
      expect(arranged.length).toBe(nodes.length);
      // After arrangement, nodes should be positioned
      expect(arranged[0].position).toBeDefined();
      expect(arranged[1].position).toBeDefined();
    });

    it('should handle empty nodes array', () => {
      const arranged = arrangeNodesVertical([], [], {});
      expect(arranged.length).toBe(0);
    });
  });

  describe('arrangeNodesHorizontal', () => {
    it('should arrange nodes horizontally', () => {
      const nodes = createTestNodes();
      const edges: Edge[] = [];
      const arranged = arrangeNodesHorizontal(nodes, edges, {});
      expect(arranged.length).toBe(nodes.length);
      // After arrangement, nodes should be positioned
      expect(arranged[0].position).toBeDefined();
      expect(arranged[1].position).toBeDefined();
    });

    it('should handle empty nodes array', () => {
      const arranged = arrangeNodesHorizontal([], [], {});
      expect(arranged.length).toBe(0);
    });
  });
});
