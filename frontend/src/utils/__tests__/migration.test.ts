import { describe, it, expect } from 'vitest';
import { NodeType } from '@automflows/shared';
import { convertOldNodeToConsolidated, migrateWorkflow } from '../migration';

describe('migration', () => {
  describe('convertOldNodeToConsolidated', () => {
    it('should migrate click node to action node', () => {
      const oldNode = {
        id: 'n1',
        type: 'click' as any,
        data: { selector: '.btn' },
      };
      const result = convertOldNodeToConsolidated(oldNode);
      expect(result.migrated).toBe(true);
      expect(result.newNode?.type).toBe(NodeType.ACTION);
      expect(result.newNode?.data.action).toBe('click');
    });

    it('should migrate getText node to elementQuery node', () => {
      const oldNode = {
        id: 'n1',
        type: 'getText' as any,
        data: { selector: '.text' },
      };
      const result = convertOldNodeToConsolidated(oldNode);
      expect(result.migrated).toBe(true);
      expect(result.newNode?.type).toBe(NodeType.ELEMENT_QUERY);
      expect(result.newNode?.data.action).toBe('getText');
    });

    it('should migrate navigate node to navigation node', () => {
      const oldNode = {
        id: 'n1',
        type: 'navigate' as any,
        data: { url: 'https://example.com' },
      };
      const result = convertOldNodeToConsolidated(oldNode);
      expect(result.migrated).toBe(true);
      expect(result.newNode?.type).toBe(NodeType.NAVIGATION);
      expect(result.newNode?.data.action).toBe('navigate');
    });

    it('should return migrated false for unknown node types', () => {
      const oldNode = {
        id: 'n1',
        type: 'unknown' as any,
        data: {},
      };
      const result = convertOldNodeToConsolidated(oldNode);
      expect(result.migrated).toBe(false);
    });
  });

  describe('migrateWorkflow', () => {
    it('should migrate workflow with old nodes', () => {
      const workflow = {
        nodes: [
          { id: 'n1', type: 'click' as any, data: {} },
          { id: 'n2', type: NodeType.ACTION, data: {} },
        ],
        edges: [],
      } as any;
      const result = migrateWorkflow(workflow);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.workflow.nodes.length).toBe(2);
    });
  });
});
