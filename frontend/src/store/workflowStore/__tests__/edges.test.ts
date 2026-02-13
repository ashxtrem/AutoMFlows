import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { NodeType } from '@automflows/shared';
import { createEdgesSlice, EdgesSlice } from '../edges';
import { createNodesSlice, NodesSlice } from '../nodes';
import { getInitialState } from '../core';

type TestStore = ReturnType<typeof getInitialState> & EdgesSlice & NodesSlice;

describe('WorkflowStore Edges Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    store = create<TestStore>((set, get) => ({
      ...createEdgesSlice(set, get),
      ...createNodesSlice(set, get),
      ...getInitialState(),
      saveToHistory: vi.fn(),
      updateNodeData: vi.fn(),
    }));
  });

  it('should set edges', () => {
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }] as any;
    store.getState().setEdges(edges);
    expect(store.getState().edges).toEqual(edges);
  });

  it('should handle onConnect', () => {
    store.getState().setNodes([
      { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 } },
      { id: 'n2', data: { type: NodeType.ACTION }, position: { x: 100, y: 0 } },
    ] as any);
    
    store.getState().onConnect({
      source: 'n1',
      target: 'n2',
      sourceHandle: 'output',
      targetHandle: 'driver',
    });
    
    expect(store.getState().edges.length).toBeGreaterThan(0);
  });

  it('should prevent self-connections', () => {
    store.getState().setNodes([
      { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 } },
    ] as any);
    
    const initialEdgeCount = store.getState().edges.length;
    store.getState().onConnect({
      source: 'n1',
      target: 'n1',
      sourceHandle: 'output',
      targetHandle: 'driver',
    });
    
    expect(store.getState().edges.length).toBe(initialEdgeCount);
  });
});
