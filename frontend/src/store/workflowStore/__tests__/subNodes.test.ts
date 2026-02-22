import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { NodeType } from '@automflows/shared';
import { createSubNodesSlice, SubNodesSlice } from '../subNodes';
import { createNodesSlice, NodesSlice } from '../nodes';
import { getInitialState } from '../core';

type TestStore = ReturnType<typeof getInitialState> & NodesSlice & SubNodesSlice;

function createTestStore() {
  return create<TestStore>((set, get) => ({
    ...getInitialState(),
    ...createNodesSlice(set, get),
    ...createSubNodesSlice(set, get),
    saveToHistory: vi.fn(),
  }));
}

function seedNodes(store: ReturnType<typeof createTestStore>) {
  store.setState({
    nodes: [
      { id: 'n1', type: 'custom', data: { type: NodeType.START, label: 'Start' }, position: { x: 0, y: 0 } } as any,
      { id: 'n2', type: 'custom', data: { type: NodeType.ACTION, label: 'Action' }, position: { x: 200, y: 0 } } as any,
      { id: 'n3', type: 'custom', data: { type: NodeType.WAIT, label: 'Wait' }, position: { x: 400, y: 0 } } as any,
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'output', targetHandle: 'input' },
    ],
  });
}

describe('WorkflowStore SubNodes Slice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    localStorage.clear();
    store = createTestStore();
  });

  describe('saveAsSubNode', () => {
    it('should save selected nodes as a sub node snippet', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('My Snippet', ['n1', 'n2']);

      const snippets = store.getState().subNodeSnippets;
      expect(snippets).toHaveLength(1);
      expect(snippets[0].name).toBe('My Snippet');
      expect(snippets[0].nodes).toHaveLength(2);
      expect(snippets[0].nodes[0].id).toBe('n1');
      expect(snippets[0].nodes[1].id).toBe('n2');
    });

    it('should only include edges between selected nodes', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Partial', ['n1', 'n2']);

      const snippet = store.getState().subNodeSnippets[0];
      expect(snippet.edges).toHaveLength(1);
      expect(snippet.edges[0].source).toBe('n1');
      expect(snippet.edges[0].target).toBe('n2');
    });

    it('should include all edges when all connected nodes are selected', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Full', ['n1', 'n2', 'n3']);

      const snippet = store.getState().subNodeSnippets[0];
      expect(snippet.edges).toHaveLength(2);
    });

    it('should deep-clone nodes so mutations do not affect the snippet', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Clone Test', ['n1']);

      store.getState().updateNodeData('n1', { label: 'Changed' });

      const snippet = store.getState().subNodeSnippets[0];
      expect(snippet.nodes[0].data.label).toBe('Start');
    });

    it('should not save if no matching nodes found', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Empty', ['nonexistent']);
      expect(store.getState().subNodeSnippets).toHaveLength(0);
    });

    it('should save a single node', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Single', ['n3']);

      const snippet = store.getState().subNodeSnippets[0];
      expect(snippet.nodes).toHaveLength(1);
      expect(snippet.edges).toHaveLength(0);
    });

    it('should persist to localStorage', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Persisted', ['n1']);

      const stored = JSON.parse(localStorage.getItem('automflows-subnodes')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Persisted');
    });

    it('should allow saving multiple snippets', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('First', ['n1']);
      store.getState().saveAsSubNode('Second', ['n2']);

      expect(store.getState().subNodeSnippets).toHaveLength(2);
    });
  });

  describe('insertSubNode', () => {
    it('should insert nodes at the specified position', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Insert Test', ['n1', 'n2']);
      const snippetId = store.getState().subNodeSnippets[0].id;

      const initialNodeCount = store.getState().nodes.length;
      store.getState().insertSubNode(snippetId, { x: 500, y: 300 });

      expect(store.getState().nodes.length).toBe(initialNodeCount + 2);
    });

    it('should generate new unique IDs for inserted nodes', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('ID Test', ['n1', 'n2']);
      const snippetId = store.getState().subNodeSnippets[0].id;

      store.getState().insertSubNode(snippetId, { x: 500, y: 300 });

      const allIds = store.getState().nodes.map((n) => n.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('should remap edge source/target to new node IDs', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Edge Test', ['n1', 'n2']);
      const snippetId = store.getState().subNodeSnippets[0].id;

      const initialEdgeCount = store.getState().edges.length;
      store.getState().insertSubNode(snippetId, { x: 500, y: 300 });

      const newEdges = store.getState().edges.slice(initialEdgeCount);
      expect(newEdges).toHaveLength(1);
      expect(newEdges[0].source).not.toBe('n1');
      expect(newEdges[0].target).not.toBe('n2');
      // Verify they point to actual inserted nodes
      const insertedNodeIds = store.getState().nodes.slice(3).map((n) => n.id);
      expect(insertedNodeIds).toContain(newEdges[0].source);
      expect(insertedNodeIds).toContain(newEdges[0].target);
    });

    it('should position nodes relative to the insertion point', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Position Test', ['n1', 'n2']);
      const snippetId = store.getState().subNodeSnippets[0].id;

      store.getState().insertSubNode(snippetId, { x: 500, y: 300 });

      const insertedNodes = store.getState().nodes.slice(3);
      expect(insertedNodes[0].position).toEqual({ x: 500, y: 300 });
      expect(insertedNodes[1].position).toEqual({ x: 700, y: 300 });
    });

    it('should not insert if snippet does not exist', () => {
      seedNodes(store);
      const initialCount = store.getState().nodes.length;
      store.getState().insertSubNode('nonexistent', { x: 0, y: 0 });
      expect(store.getState().nodes.length).toBe(initialCount);
    });

    it('should allow inserting the same snippet multiple times', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Multi Insert', ['n1']);
      const snippetId = store.getState().subNodeSnippets[0].id;

      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValueOnce(now);
      store.getState().insertSubNode(snippetId, { x: 100, y: 100 });
      vi.spyOn(Date, 'now').mockReturnValueOnce(now + 1);
      store.getState().insertSubNode(snippetId, { x: 200, y: 200 });
      vi.restoreAllMocks();

      expect(store.getState().nodes.length).toBe(5);
      const allIds = store.getState().nodes.map((n) => n.id);
      expect(new Set(allIds).size).toBe(5);
    });

    it('should set selected to false on inserted nodes', () => {
      seedNodes(store);
      store.setState({
        nodes: store.getState().nodes.map((n) => ({ ...n, selected: true })),
      });
      store.getState().saveAsSubNode('Select Test', ['n1']);
      const snippetId = store.getState().subNodeSnippets[0].id;

      store.getState().insertSubNode(snippetId, { x: 0, y: 0 });

      const insertedNode = store.getState().nodes[store.getState().nodes.length - 1];
      expect(insertedNode.selected).toBe(false);
    });
  });

  describe('deleteSubNode', () => {
    it('should remove a snippet from the list', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('ToDelete', ['n1']);
      const snippetId = store.getState().subNodeSnippets[0].id;

      store.getState().deleteSubNode(snippetId);
      expect(store.getState().subNodeSnippets).toHaveLength(0);
    });

    it('should persist deletion to localStorage', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('ToDelete', ['n1']);
      const snippetId = store.getState().subNodeSnippets[0].id;

      store.getState().deleteSubNode(snippetId);

      const stored = JSON.parse(localStorage.getItem('automflows-subnodes')!);
      expect(stored).toHaveLength(0);
    });

    it('should only delete the specified snippet', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Keep', ['n1']);
      store.getState().saveAsSubNode('Delete', ['n2']);
      const deleteId = store.getState().subNodeSnippets[1].id;

      store.getState().deleteSubNode(deleteId);

      expect(store.getState().subNodeSnippets).toHaveLength(1);
      expect(store.getState().subNodeSnippets[0].name).toBe('Keep');
    });

    it('should handle deleting nonexistent snippet gracefully', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Exists', ['n1']);
      store.getState().deleteSubNode('nonexistent');
      expect(store.getState().subNodeSnippets).toHaveLength(1);
    });
  });

  describe('isSubNodeNameTaken', () => {
    it('should return false when no snippets exist', () => {
      expect(store.getState().isSubNodeNameTaken('Test')).toBe(false);
    });

    it('should return true for exact name match', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('My Snippet', ['n1']);
      expect(store.getState().isSubNodeNameTaken('My Snippet')).toBe(true);
    });

    it('should be case-insensitive', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('My Snippet', ['n1']);
      expect(store.getState().isSubNodeNameTaken('my snippet')).toBe(true);
      expect(store.getState().isSubNodeNameTaken('MY SNIPPET')).toBe(true);
    });

    it('should return false for different names', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('My Snippet', ['n1']);
      expect(store.getState().isSubNodeNameTaken('Other Name')).toBe(false);
    });
  });

  describe('loadSubNodes', () => {
    it('should load snippets from localStorage', () => {
      const snippets = [
        {
          id: 'test-1',
          name: 'Preloaded',
          createdAt: Date.now(),
          nodes: [{ id: 'x1', type: 'custom', data: { type: 'START' }, position: { x: 0, y: 0 } }],
          edges: [],
        },
      ];
      localStorage.setItem('automflows-subnodes', JSON.stringify(snippets));

      store.getState().loadSubNodes();

      expect(store.getState().subNodeSnippets).toHaveLength(1);
      expect(store.getState().subNodeSnippets[0].name).toBe('Preloaded');
    });

    it('should return empty array when localStorage has no data', () => {
      localStorage.clear();
      store.getState().loadSubNodes();
      expect(store.getState().subNodeSnippets).toHaveLength(0);
    });

    it('should return empty array when localStorage has invalid JSON', () => {
      localStorage.setItem('automflows-subnodes', 'not-json');
      store.getState().loadSubNodes();
      expect(store.getState().subNodeSnippets).toHaveLength(0);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist across store recreations', () => {
      seedNodes(store);
      store.getState().saveAsSubNode('Persistent', ['n1', 'n2']);

      const newStore = createTestStore();
      expect(newStore.getState().subNodeSnippets).toHaveLength(1);
      expect(newStore.getState().subNodeSnippets[0].name).toBe('Persistent');
    });
  });
});
