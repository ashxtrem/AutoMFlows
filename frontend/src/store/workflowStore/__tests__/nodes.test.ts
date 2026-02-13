import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { NodeType } from '@automflows/shared';
import { createNodesSlice, NodesSlice } from '../nodes';
import { WorkflowStateCore, getInitialState } from '../core';

type TestStore = WorkflowStateCore & NodesSlice;

describe('WorkflowStore Nodes Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    store = create<TestStore>((set, get) => ({
      ...createNodesSlice(set, get),
      ...getInitialState(),
      saveToHistory: vi.fn(),
    }));
  });

  it('should add a node', () => {
    store.getState().addNode(NodeType.START, { x: 100, y: 100 });
    expect(store.getState().nodes.length).toBe(1);
    expect(store.getState().nodes[0].data.type).toBe(NodeType.START);
  });

  it('should update node data', () => {
    store.getState().addNode(NodeType.ACTION, { x: 100, y: 100 });
    const nodeId = store.getState().nodes[0].id;
    store.getState().updateNodeData(nodeId, { label: 'Test Action' });
    expect(store.getState().nodes[0].data.label).toBe('Test Action');
  });

  it('should delete a node', () => {
    store.getState().addNode(NodeType.START, { x: 100, y: 100 });
    const nodeId = store.getState().nodes[0].id;
    store.getState().deleteNode(nodeId);
    expect(store.getState().nodes.length).toBe(0);
  });

  it('should set selected node', () => {
    store.getState().addNode(NodeType.START, { x: 100, y: 100 });
    const node = store.getState().nodes[0];
    store.getState().setSelectedNode(node);
    expect(store.getState().selectedNode).toBe(node);
  });

  it('should clear selection', () => {
    store.getState().addNode(NodeType.START, { x: 100, y: 100 });
    store.getState().setSelectedNode(store.getState().nodes[0]);
    store.getState().clearSelection();
    expect(store.getState().selectedNode).toBeNull();
    expect(store.getState().selectedNodeIds.size).toBe(0);
  });
});
