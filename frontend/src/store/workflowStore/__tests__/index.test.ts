import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../index';

describe('WorkflowStore Index', () => {
  it('should export useWorkflowStore hook', () => {
    expect(useWorkflowStore).toBeDefined();
    expect(typeof useWorkflowStore).toBe('function');
  });

  it('should provide store state', () => {
    const state = useWorkflowStore.getState();
    expect(state).toBeDefined();
    expect(state.nodes).toBeDefined();
    expect(state.edges).toBeDefined();
  });
});
