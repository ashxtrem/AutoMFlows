import { describe, it, expect } from 'vitest';
import { generateWorkflowHash } from '../workflowHash';
import { Node, Edge } from 'reactflow';
import { NodeType } from '@automflows/shared';

describe('workflowHash', () => {
  describe('generateWorkflowHash', () => {
    it('should generate hash for workflow', () => {
      const nodes: Node[] = [
        { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 } },
        { id: 'n2', data: { type: NodeType.ACTION }, position: { x: 100, y: 0 } },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
      ];
      const hash = generateWorkflowHash(nodes, edges);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate same hash for same workflow structure', () => {
      const nodes: Node[] = [
        { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 } },
        { id: 'n2', data: { type: NodeType.ACTION }, position: { x: 100, y: 0 } },
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
      ];
      const hash1 = generateWorkflowHash(nodes, edges);
      const hash2 = generateWorkflowHash(nodes, edges);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different workflows', () => {
      const nodes1: Node[] = [
        { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 } },
      ];
      const nodes2: Node[] = [
        { id: 'n1', data: { type: NodeType.ACTION }, position: { x: 0, y: 0 } },
      ];
      const hash1 = generateWorkflowHash(nodes1, []);
      const hash2 = generateWorkflowHash(nodes2, []);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty workflow', () => {
      const hash = generateWorkflowHash([], []);
      expect(typeof hash).toBe('string');
    });
  });
});
