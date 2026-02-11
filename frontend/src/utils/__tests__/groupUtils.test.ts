import { describe, it, expect } from 'vitest';
import { calculateGroupBounds } from '../groupUtils';
import { Node } from 'reactflow';
import { NodeType } from '@automflows/shared';

describe('groupUtils', () => {
  describe('calculateGroupBounds', () => {
    it('should return null for empty nodes array', () => {
      const bounds = calculateGroupBounds([]);
      expect(bounds).toBeNull();
    });

    it('should calculate bounds for single node', () => {
      const nodes: Node[] = [
        {
          id: 'n1',
          data: { type: NodeType.START },
          position: { x: 100, y: 100 },
          width: 200,
          height: 100,
        },
      ];
      const bounds = calculateGroupBounds(nodes);
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBeLessThanOrEqual(100);
      expect(bounds?.width).toBeGreaterThan(0);
    });

    it('should calculate bounds for multiple nodes', () => {
      const nodes: Node[] = [
        {
          id: 'n1',
          data: { type: NodeType.START },
          position: { x: 0, y: 0 },
          width: 200,
          height: 100,
        },
        {
          id: 'n2',
          data: { type: NodeType.ACTION },
          position: { x: 300, y: 200 },
          width: 200,
          height: 100,
        },
      ];
      const bounds = calculateGroupBounds(nodes);
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBeLessThanOrEqual(0);
      expect(bounds?.y).toBeLessThanOrEqual(0);
      expect(bounds?.width).toBeGreaterThan(300);
      expect(bounds?.height).toBeGreaterThan(200);
    });

    it('should include padding in bounds', () => {
      const nodes: Node[] = [
        {
          id: 'n1',
          data: { type: NodeType.START },
          position: { x: 100, y: 100 },
          width: 200,
          height: 100,
        },
      ];
      const bounds = calculateGroupBounds(nodes, 10);
      expect(bounds?.x).toBeLessThan(100);
      expect(bounds?.width).toBeGreaterThan(200);
    });
  });
});
