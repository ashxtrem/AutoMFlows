import { StateCreator } from 'zustand';
import { WorkflowStateCore } from './core';
import { WorkflowSnapshot } from './types';

export interface HistorySlice {
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const createHistorySlice: StateCreator<
  WorkflowStateCore & HistorySlice,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  saveToHistory: () => {
    const state = get();
    const snapshot: WorkflowSnapshot = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
      groups: JSON.parse(JSON.stringify(state.groups)),
    };
    
    // Remove any history after current index (if we're not at the end)
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    
    // Check if this snapshot is different from the last one
    const lastSnapshot = newHistory[newHistory.length - 1];
    const isDifferent = !lastSnapshot || 
      JSON.stringify(lastSnapshot.nodes) !== JSON.stringify(snapshot.nodes) ||
      JSON.stringify(lastSnapshot.edges) !== JSON.stringify(snapshot.edges) ||
      JSON.stringify(lastSnapshot.groups) !== JSON.stringify(snapshot.groups);
    
    if (isDifferent) {
      newHistory.push(snapshot);
      
      // Limit history size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
      } else {
        // Only increment index if we're not trimming
        set({ historyIndex: newHistory.length - 1 });
      }
      
      set({ history: newHistory });
    }
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      // Show global loader to trigger canvas reload (like updateNodeData does)
      set({ canvasReloading: true });
      
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      // Prevent restoring empty state if we currently have nodes (safety check)
      if (snapshot.nodes.length === 0 && state.nodes.length > 0 && newIndex === 0) {
        set({ canvasReloading: false });
        return; // Don't restore empty state
      }
      const restoredNodes = JSON.parse(JSON.stringify(snapshot.nodes));
      const restoredEdges = JSON.parse(JSON.stringify(snapshot.edges));
      const restoredGroups = snapshot.groups ? JSON.parse(JSON.stringify(snapshot.groups)) : [];
      
      set({
        nodes: restoredNodes,
        edges: restoredEdges,
        groups: restoredGroups,
        historyIndex: newIndex,
        selectedNode: null,
      });
      
      // Hide loader after a short delay to allow ReactFlow to reload (like updateNodeData does)
      setTimeout(() => {
        set({ canvasReloading: false });
      }, 100);
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      // Show global loader to trigger canvas reload (like updateNodeData does)
      set({ canvasReloading: true });
      
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      const restoredNodes = JSON.parse(JSON.stringify(snapshot.nodes));
      const restoredEdges = JSON.parse(JSON.stringify(snapshot.edges));
      const restoredGroups = snapshot.groups ? JSON.parse(JSON.stringify(snapshot.groups)) : [];
      
      set({
        nodes: restoredNodes,
        edges: restoredEdges,
        groups: restoredGroups,
        historyIndex: newIndex,
        selectedNode: null,
      });
      
      // Hide loader after a short delay to allow ReactFlow to reload (like updateNodeData does)
      setTimeout(() => {
        set({ canvasReloading: false });
      }, 100);
    }
  },

  canUndo: () => {
    return get().historyIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  clearHistory: () => {
    const state = get();
    const currentSnapshot: WorkflowSnapshot = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
    };
    set({
      history: [currentSnapshot],
      historyIndex: 0,
    });
  },
});
