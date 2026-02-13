import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createExecutionSlice, ExecutionSlice } from '../execution';
import { getInitialState } from '../core';

type TestStore = ReturnType<typeof getInitialState> & ExecutionSlice;

describe('WorkflowStore Execution Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    store = create<TestStore>((set, get) => ({
      ...createExecutionSlice(set, get),
      ...getInitialState(),
    }));
  });

  it('should set execution status', () => {
    store.getState().setExecutionStatus('running');
    expect(store.getState().executionStatus).toBe('running');
  });

  it('should set executing node id', () => {
    store.getState().setExecutingNodeId('node-1');
    expect(store.getState().executingNodeId).toBe('node-1');
  });

  it('should reset execution', () => {
    store.getState().setExecutionStatus('running');
    store.getState().setExecutingNodeId('node-1');
    store.getState().resetExecution();
    expect(store.getState().executionStatus).toBe('idle');
    expect(store.getState().executingNodeId).toBeNull();
    expect(store.getState().failedNodes.size).toBe(0);
  });

  it('should set node error', () => {
    store.getState().setNodeError('node-1', { message: 'Test error', stack: '' });
    expect(store.getState().failedNodes.has('node-1')).toBe(true);
  });

  it('should clear node error', () => {
    store.getState().setNodeError('node-1', { message: 'Test error', stack: '' });
    store.getState().clearNodeError('node-1');
    expect(store.getState().failedNodes.has('node-1')).toBe(false);
  });

  it('should clear all node errors', () => {
    store.getState().setNodeError('node-1', { message: 'Error 1', stack: '' });
    store.getState().setNodeError('node-2', { message: 'Error 2', stack: '' });
    store.getState().clearAllNodeErrors();
    expect(store.getState().failedNodes.size).toBe(0);
    expect(store.getState().errorPopupNodeId).toBeNull();
  });
});
