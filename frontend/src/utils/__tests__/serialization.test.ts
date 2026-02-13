import { describe, it, expect } from 'vitest';
import { NodeType } from '@automflows/shared';
import { serializeWorkflow, deserializeWorkflow } from '../serialization';
import { Node, Edge } from 'reactflow';

describe('serialization', () => {
  describe('serializeWorkflow', () => {
    it('should serialize nodes and edges to workflow format', () => {
      const nodes: Node[] = [
        { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 } },
      ];
      const edges: Edge[] = [];
      const workflow = serializeWorkflow(nodes, edges);
      expect(workflow.nodes.length).toBe(1);
      expect(workflow.edges.length).toBe(0);
    });

    it('should include groups if provided', () => {
      const nodes: Node[] = [];
      const edges: Edge[] = [];
      const groups = [{ id: 'g1', name: 'Group 1', nodeIds: [] }];
      const workflow = serializeWorkflow(nodes, edges, groups);
      expect(workflow.groups).toEqual(groups);
    });
  });

  describe('deserializeWorkflow', () => {
    it('should deserialize workflow to nodes and edges', () => {
      const workflow = {
        nodes: [
          { id: 'n1', type: NodeType.START, position: { x: 0, y: 0 }, data: {} },
        ],
        edges: [],
      } as any;
      const result = deserializeWorkflow(workflow);
      expect(result.nodes.length).toBe(1);
      expect(result.edges.length).toBe(0);
    });

    it('should preserve node labels', () => {
      const workflow = {
        nodes: [
          { id: 'n1', type: NodeType.START, position: { x: 0, y: 0 }, data: { label: 'Custom Label' } },
        ],
        edges: [],
      } as any;
      const result = deserializeWorkflow(workflow);
      expect(result.nodes[0].data.label).toBe('Custom Label');
    });
  });
});
