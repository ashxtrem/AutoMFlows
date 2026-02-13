import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { NodeType } from '@automflows/shared';
import { createGroupsSlice, GroupsSlice } from '../groups';
import { createNodesSlice, NodesSlice } from '../nodes';
import { getInitialState } from '../core';

type TestStore = ReturnType<typeof getInitialState> & GroupsSlice & NodesSlice;

describe('WorkflowStore Groups Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    store = create<TestStore>((set, get) => ({
      ...createGroupsSlice(set, get),
      ...createNodesSlice(set, get),
      ...getInitialState(),
      saveToHistory: vi.fn(),
    }));
    
    // Add some nodes for testing
    store.setState({
      nodes: [
        { id: 'n1', data: { type: NodeType.START }, position: { x: 0, y: 0 }, width: 100, height: 50 } as any,
        { id: 'n2', data: { type: NodeType.ACTION }, position: { x: 200, y: 0 }, width: 100, height: 50 } as any,
      ],
    });
  });

  it('should create a group', () => {
    store.getState().createGroup(['n1', 'n2']);
    expect(store.getState().groups.length).toBe(1);
    expect(store.getState().groups[0].nodeIds).toEqual(['n1', 'n2']);
  });

  it('should not create group with empty nodeIds', () => {
    const initialGroupCount = store.getState().groups.length;
    store.getState().createGroup([]);
    expect(store.getState().groups.length).toBe(initialGroupCount);
  });

  it('should delete a group', () => {
    store.getState().createGroup(['n1', 'n2']);
    const groupId = store.getState().groups[0].id;
    store.getState().deleteGroup(groupId);
    expect(store.getState().groups.length).toBe(0);
  });

  it('should update a group', () => {
    store.getState().createGroup(['n1', 'n2']);
    const groupId = store.getState().groups[0].id;
    store.getState().updateGroup(groupId, { name: 'Updated Group' });
    expect(store.getState().groups[0].name).toBe('Updated Group');
  });
});
