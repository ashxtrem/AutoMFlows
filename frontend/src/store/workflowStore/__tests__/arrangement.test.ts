import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { NodeType } from '@automflows/shared';
import { createArrangementSlice, ArrangementSlice } from '../arrangement';
import { getInitialState } from '../core';

// Break circular dependency: arrangement -> Canvas -> workflowStore -> arrangement
vi.mock('../../../components/Canvas', () => ({
  getReactFlowSetNodes: vi.fn(() => null),
}));

type TestStore = ReturnType<typeof getInitialState> & ArrangementSlice & { saveToHistory: () => void };

describe('WorkflowStore Arrangement Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  const initialNodes = [
    { id: 'n1', data: { type: NodeType.START }, position: { x: 500, y: 500 }, width: 200, height: 100 },
    { id: 'n2', data: { type: NodeType.ACTION }, position: { x: 500, y: 500 }, width: 200, height: 100 },
  ] as any;

  const edges = [
    { id: 'e1', source: 'n1', target: 'n2' },
  ] as any;

  beforeEach(() => {
    store = create<TestStore>((set, get) => ({
      ...createArrangementSlice(set, get),
      ...getInitialState(),
      saveToHistory: vi.fn(),
    }));
    store.setState({ nodes: initialNodes, edges });
  });

  it('arrangeNodes vertical repositions nodes to different positions', () => {
    store.getState().arrangeNodes('vertical');
    const arranged = store.getState().nodes;

    expect(arranged).toHaveLength(2);

    const posMap = new Map(arranged.map((n: any) => [n.id, n.position]));
    expect(posMap.get('n1')!.x).toBe(posMap.get('n2')!.x);
    expect(posMap.get('n1')!.y).toBeLessThan(posMap.get('n2')!.y);
  });

  it('arrangeNodes horizontal repositions nodes to different positions', () => {
    store.getState().arrangeNodes('horizontal');
    const arranged = store.getState().nodes;

    expect(arranged).toHaveLength(2);

    const posMap = new Map(arranged.map((n: any) => [n.id, n.position]));
    expect(posMap.get('n1')!.y).toBe(posMap.get('n2')!.y);
    expect(posMap.get('n1')!.x).toBeLessThan(posMap.get('n2')!.x);
  });

  it('arrangeNodes updates store state (not the original array)', () => {
    const nodesBefore = store.getState().nodes;
    store.getState().arrangeNodes('vertical');
    const nodesAfter = store.getState().nodes;

    expect(nodesAfter).not.toBe(nodesBefore);
  });
});
