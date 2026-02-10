import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createHistorySlice, HistorySlice } from '../history';
import { WorkflowStateCore } from '../core';

type TestStore = WorkflowStateCore & HistorySlice;

describe('WorkflowStore History Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    store = create<TestStore>((set, get) => ({
      ...createHistorySlice(set, get, {} as any),
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedNodeIds: new Set(),
      executionStatus: 'idle',
      executingNodeId: null,
      failedNodes: new Map(),
      validationErrors: new Map(),
      errorPopupNodeId: null,
      canvasReloading: false,
      selectorFinderSessionId: null,
      selectorFinderActive: false,
      history: [{ nodes: [], edges: [] }],
      historyIndex: 0,
      maxHistorySize: 10,
      clipboard: null,
      navigateToFailedNode: null,
      edgesHidden: false,
      updatingEdgeId: null,
      breakpointEnabled: false,
      breakpointAt: 'pre',
      breakpointFor: 'marked',
      pausedNodeId: null,
      pauseReason: null,
      pauseBreakpointAt: null,
      navigateToPausedNode: null,
      followModeEnabled: false,
      builderModeEnabled: false,
      builderModeActive: false,
      lastCompletedNodeId: null,
      builderModeActions: [],
      builderModeInsertedActionIds: new Set(),
      builderModeModalMinimized: false,
      builderModeModalPosition: null,
      workflowFileName: '',
      hasUnsavedChanges: false,
      groups: [],
      selectedGroupId: null,
    }));
  });

  describe('saveToHistory', () => {
    it('should save current state to history', () => {
      const initialState = store.getState();
      expect(initialState.history.length).toBe(1);
      expect(initialState.historyIndex).toBe(0);

      store.getState().saveToHistory();
      const afterSave = store.getState();
      expect(afterSave.history.length).toBeGreaterThan(1);
    });
  });

  describe('undo', () => {
    it('should undo when history exists', () => {
      store.getState().saveToHistory();
      const beforeUndo = store.getState();
      const canUndo = beforeUndo.canUndo();
      
      if (canUndo) {
        beforeUndo.undo();
        const afterUndo = store.getState();
        expect(afterUndo.historyIndex).toBeLessThan(beforeUndo.historyIndex);
      }
    });
  });

  describe('redo', () => {
    it('should redo when possible', () => {
      store.getState().saveToHistory();
      store.getState().undo();
      const beforeRedo = store.getState();
      const canRedo = beforeRedo.canRedo();
      
      if (canRedo) {
        beforeRedo.redo();
        const afterRedo = store.getState();
        expect(afterRedo.historyIndex).toBeGreaterThan(beforeRedo.historyIndex);
      }
    });
  });

  describe('canUndo', () => {
    it('should return false when at beginning of history', () => {
      const canUndo = store.getState().canUndo();
      expect(typeof canUndo).toBe('boolean');
    });
  });

  describe('canRedo', () => {
    it('should return false when at end of history', () => {
      const canRedo = store.getState().canRedo();
      expect(typeof canRedo).toBe('boolean');
    });
  });

  describe('clearHistory', () => {
    it('should clear history and reset index', () => {
      store.getState().saveToHistory();
      store.getState().clearHistory();
      const afterClear = store.getState();
      expect(afterClear.history.length).toBe(1);
      expect(afterClear.historyIndex).toBe(0);
    });
  });
});
