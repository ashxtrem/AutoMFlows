import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { NodeType } from '@automflows/shared';
import { createPropertyInputSlice, PropertyInputSlice } from '../propertyInput';
import { getInitialState } from '../core';

type TestStore = ReturnType<typeof getInitialState> & PropertyInputSlice & { updateNodeData: (id: string, data: any) => void; saveToHistory: () => void };

describe('WorkflowStore Property Input Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    store = create<TestStore>((set, get) => ({
      ...createPropertyInputSlice(set, get),
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
        { id: 'n1', data: { type: NodeType.ACTION, timeout: 30000 }, position: { x: 0, y: 0 } } as any,
      ],
    });
  });

  it('should convert property to input', () => {
    store.getState().convertPropertyToInput('n1', 'timeout');
    const node = store.getState().nodes.find(n => n.id === 'n1');
    expect(node?.data._inputConnections?.timeout).toBeDefined();
  });

  it('should convert input to property', () => {
    store.getState().convertPropertyToInput('n1', 'timeout');
    store.getState().convertInputToProperty('n1', 'timeout');
    const node = store.getState().nodes.find(n => n.id === 'n1');
    expect(node?.data._inputConnections?.timeout).toBeUndefined();
  });
});
