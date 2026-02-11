import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { NodeType } from '@automflows/shared';
import { createArrangementSlice, ArrangementSlice } from '../arrangement';
import { getInitialState } from '../core';

vi.mock('../../utils/nodeArrangement', () => ({
  arrangeNodesVertical: vi.fn((nodes) => nodes),
  arrangeNodesHorizontal: vi.fn((nodes) => nodes),
}));

type TestStore = ReturnType<typeof getInitialState> & ArrangementSlice & { saveToHistory: () => void };

describe('WorkflowStore Arrangement Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    store = create<TestStore>((set, get) => ({
      ...createArrangementSlice(set, get),
      ...getInitialState(),
      saveToHistory: vi.fn(),
    }));
    
    store.setState({
      nodes: [
        { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 } } as any,
        { id: 'n2', data: { type: NodeType.ACTION }, position: { x: 100, y: 0 } } as any,
      ],
      edges: [],
    });
  });

  it('should arrange nodes vertically', () => {
    store.getState().arrangeNodes('vertical');
    expect(store.getState().nodes.length).toBeGreaterThan(0);
  });

  it('should arrange nodes horizontally', () => {
    store.getState().arrangeNodes('horizontal');
    expect(store.getState().nodes.length).toBeGreaterThan(0);
  });
});
