import { NodeType } from '@automflows/shared';
import { getDefaultNodeLabel, getNodeDisplayName, getTestNodes, escapeXml } from '../utils';
import { ExecutionMetadata, NodeExecutionEvent } from '../../executionTracker';
import { Workflow } from '@automflows/shared';

describe('ReportGenerator Utils', () => {
  describe('getDefaultNodeLabel', () => {
    it('should return correct label for built-in node types', () => {
      expect(getDefaultNodeLabel(NodeType.START)).toBe('Start');
      expect(getDefaultNodeLabel(NodeType.OPEN_BROWSER)).toBe('Open Browser');
      expect(getDefaultNodeLabel(NodeType.ACTION)).toBe('Action');
      expect(getDefaultNodeLabel(NodeType.VERIFY)).toBe('Verify');
    });

    it('should return nodeType string for unknown types', () => {
      expect(getDefaultNodeLabel('custom-plugin-node')).toBe('custom-plugin-node');
      expect(getDefaultNodeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getNodeDisplayName', () => {
    it('should return custom label if provided', () => {
      const node: NodeExecutionEvent = {
        nodeId: 'node1',
        nodeType: NodeType.ACTION,
        nodeLabel: 'Custom Label',
        startTime: Date.now(),
        status: 'completed',
      };
      expect(getNodeDisplayName(node)).toBe('Custom Label');
    });

    it('should return default label if no custom label', () => {
      const node: NodeExecutionEvent = {
        nodeId: 'node1',
        nodeType: NodeType.ACTION,
        startTime: Date.now(),
        status: 'completed',
      };
      expect(getNodeDisplayName(node)).toBe('Action');
    });

    it('should return nodeType as fallback when no label', () => {
      const node: NodeExecutionEvent = {
        nodeId: 'node1',
        nodeType: 'unknown-type' as any,
        startTime: Date.now(),
        status: 'completed',
      };
      // getNodeDisplayName returns nodeType for unknown types, not nodeId
      expect(getNodeDisplayName(node)).toBe('unknown-type');
    });
  });

  describe('getTestNodes', () => {
    it('should include nodes with isTest undefined', () => {
      const metadata: ExecutionMetadata = {
        executionId: 'exec1',
        workflowName: 'test',
        startTime: Date.now(),
        status: 'completed',
        outputDirectory: '/tmp',
        screenshotsDirectory: '/tmp/screenshots',
        snapshotsDirectory: '/tmp/snapshots',
        videosDirectory: '/tmp/videos',
        nodes: [
          {
            nodeId: 'node1',
            nodeType: NodeType.ACTION,
            startTime: Date.now(),
            status: 'completed',
          },
        ],
      };
      const workflow: Workflow = {
      nodes: [
        {
          id: 'node1',
          type: NodeType.ACTION,
          position: { x: 0, y: 0 },
          data: {},
        },
      ],
        edges: [],
      };
      const testNodes = getTestNodes(metadata, workflow);
      expect(testNodes).toHaveLength(1);
    });

    it('should include nodes with isTest true', () => {
      const metadata: ExecutionMetadata = {
        executionId: 'exec1',
        workflowName: 'test',
        startTime: Date.now(),
        status: 'completed',
        outputDirectory: '/tmp',
        screenshotsDirectory: '/tmp/screenshots',
        snapshotsDirectory: '/tmp/snapshots',
        videosDirectory: '/tmp/videos',
        nodes: [
          {
            nodeId: 'node1',
            nodeType: NodeType.ACTION,
            startTime: Date.now(),
            status: 'completed',
          },
        ],
      };
      const workflow: Workflow = {
        nodes: [
          {
            id: 'node1',
            type: NodeType.ACTION,
            position: { x: 0, y: 0 },
            data: { isTest: true },
          },
        ],
        edges: [],
      };
      const testNodes = getTestNodes(metadata, workflow);
      expect(testNodes).toHaveLength(1);
    });

    it('should exclude nodes with isTest false', () => {
      const metadata: ExecutionMetadata = {
        executionId: 'exec1',
        workflowName: 'test',
        startTime: Date.now(),
        status: 'completed',
        outputDirectory: '/tmp',
        screenshotsDirectory: '/tmp/screenshots',
        snapshotsDirectory: '/tmp/snapshots',
        videosDirectory: '/tmp/videos',
        nodes: [
          {
            nodeId: 'node1',
            nodeType: NodeType.ACTION,
            startTime: Date.now(),
            status: 'completed',
          },
          {
            nodeId: 'node2',
            nodeType: NodeType.ACTION,
            startTime: Date.now(),
            status: 'completed',
          },
        ],
      };
      const workflow: Workflow = {
        nodes: [
          {
            id: 'node1',
            type: NodeType.ACTION,
            position: { x: 0, y: 0 },
            data: { isTest: true },
          },
          {
            id: 'node2',
            type: NodeType.ACTION,
            position: { x: 0, y: 0 },
            data: { isTest: false },
          },
        ],
        edges: [],
      };
      const testNodes = getTestNodes(metadata, workflow);
      expect(testNodes).toHaveLength(1);
      expect(testNodes[0].nodeId).toBe('node1');
    });

    it('should include nodes not found in workflow', () => {
      const metadata: ExecutionMetadata = {
        executionId: 'exec1',
        workflowName: 'test',
        startTime: Date.now(),
        status: 'completed',
        outputDirectory: '/tmp',
        screenshotsDirectory: '/tmp/screenshots',
        snapshotsDirectory: '/tmp/snapshots',
        videosDirectory: '/tmp/videos',
        nodes: [
          {
            nodeId: 'node1',
            nodeType: NodeType.ACTION,
            startTime: Date.now(),
            status: 'completed',
          },
        ],
      };
      const workflow: Workflow = {
        nodes: [],
        edges: [],
      };
      const testNodes = getTestNodes(metadata, workflow);
      expect(testNodes).toHaveLength(1);
    });
  });

  describe('escapeXml', () => {
    it('should escape XML special characters', () => {
      expect(escapeXml('&')).toBe('&amp;');
      expect(escapeXml('<')).toBe('&lt;');
      expect(escapeXml('>')).toBe('&gt;');
      expect(escapeXml('"')).toBe('&quot;');
      expect(escapeXml("'")).toBe('&apos;');
    });

    it('should escape multiple characters', () => {
      expect(escapeXml('<tag>value</tag>')).toBe('&lt;tag&gt;value&lt;/tag&gt;');
      expect(escapeXml('a & b')).toBe('a &amp; b');
      expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should not escape normal text', () => {
      expect(escapeXml('normal text')).toBe('normal text');
      expect(escapeXml('123')).toBe('123');
    });
  });
});
