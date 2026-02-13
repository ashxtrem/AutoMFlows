import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { NodeType } from '@automflows/shared';
import { createBreakpointsSlice, BreakpointsSlice } from '../breakpoints';
import { getInitialState } from '../core';

type TestStore = ReturnType<typeof getInitialState> & BreakpointsSlice & { updateNodeData: (id: string, data: any) => void; saveToHistory: () => void };

describe('WorkflowStore Breakpoints Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
    
    store = create<TestStore>((set, get) => ({
      ...createBreakpointsSlice(set, get),
      ...getInitialState(),
      updateNodeData: vi.fn((id, data) => {
        const state = get();
        const nodes = state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n);
        set({ nodes });
      }),
      saveToHistory: vi.fn(),
    }));
    
    store.setState({
      nodes: [
        { id: 'n1', data: { type: NodeType.ACTION }, position: { x: 0, y: 0 } } as any,
      ],
    });
  });

  it('should toggle breakpoint on node', () => {
    store.getState().toggleBreakpoint('n1');
    expect(store.getState().updateNodeData).toHaveBeenCalled();
  });

  it('should set breakpoint settings', () => {
    store.getState().setBreakpointSettings({ enabled: true, breakpointAt: 'post' });
    expect(store.getState().breakpointEnabled).toBe(true);
    expect(store.getState().breakpointAt).toBe('post');
  });

  it('should set paused node', () => {
    store.getState().setPausedNode('n1', 'breakpoint', 'pre');
    expect(store.getState().pausedNodeId).toBe('n1');
    expect(store.getState().pauseReason).toBe('breakpoint');
  });
});
