import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createFileManagementSlice, FileManagementSlice } from '../fileManagement';
import { getInitialState } from '../core';

type TestStore = ReturnType<typeof getInitialState> & FileManagementSlice;

describe('WorkflowStore File Management Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
    
    store = create<TestStore>((set, get) => ({
      ...createFileManagementSlice(set, get),
      ...getInitialState(),
    }));
  });

  it('should set workflow file name', () => {
    store.getState().setWorkflowFileName('test.json');
    expect(store.getState().workflowFileName).toBe('test.json');
  });

  it('should set has unsaved changes', () => {
    store.getState().setHasUnsavedChanges(true);
    expect(store.getState().hasUnsavedChanges).toBe(true);
  });
});
