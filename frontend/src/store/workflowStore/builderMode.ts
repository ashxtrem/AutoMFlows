import { StateCreator } from 'zustand';
import { RecordedAction } from '@automflows/shared';
import { WorkflowStateCore } from './core';

export interface BuilderModeSlice {
  /** @deprecated setBuilderModeEnabled is deprecated - builder mode is now triggered via breakpoint pause */
  setBuilderModeEnabled: (enabled: boolean) => void;
  setBuilderModeActive: (active: boolean) => void;
  /** @deprecated setLastCompletedNodeId is deprecated - no longer used */
  setLastCompletedNodeId: (nodeId: string | null) => void;
  setBuilderModeActions: (actions: RecordedAction[]) => void;
  addBuilderModeAction: (action: RecordedAction) => void;
  updateBuilderModeAction: (actionId: string, updates: Partial<RecordedAction>) => void;
  removeBuilderModeAction: (actionId: string) => void;
  markActionAsInserted: (actionId: string, nodeId: string) => void;
  setBuilderModeModalMinimized: (minimized: boolean) => void;
  setBuilderModeModalPosition: (position: { x: number; y: number } | null) => void;
  resetBuilderModeActions: () => void;
}

export const createBuilderModeSlice: StateCreator<
  WorkflowStateCore & BuilderModeSlice,
  [],
  [],
  BuilderModeSlice
> = (set, get) => ({
  /** @deprecated setBuilderModeEnabled is deprecated - builder mode is now triggered via breakpoint pause */
  setBuilderModeEnabled: (enabled) => {
    // Keep for backward compatibility but don't persist to localStorage
    set({ builderModeEnabled: enabled });
    // Note: localStorage persistence removed - builder mode is now breakpoint-based
  },
  
  setBuilderModeActive: (active) => {
    set({ builderModeActive: active });
  },
  
  /** @deprecated setLastCompletedNodeId is deprecated - no longer used */
  setLastCompletedNodeId: (nodeId) => {
    set({ lastCompletedNodeId: nodeId });
  },
  
  setBuilderModeActions: (actions) => {
    set({ builderModeActions: actions });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(actions));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  addBuilderModeAction: (action) => {
    const state = get();
    const newActions = [...state.builderModeActions, action];
    set({ builderModeActions: newActions });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(newActions));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  updateBuilderModeAction: (actionId, updates) => {
    const state = get();
    const newActions = state.builderModeActions.map(action => 
      action.id === actionId ? { ...action, ...updates } : action
    );
    set({ builderModeActions: newActions });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(newActions));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  removeBuilderModeAction: (actionId) => {
    const state = get();
    const newActions = state.builderModeActions.filter(action => action.id !== actionId);
    const newInsertedIds = new Set(state.builderModeInsertedActionIds);
    newInsertedIds.delete(actionId);
    set({ 
      builderModeActions: newActions,
      builderModeInsertedActionIds: newInsertedIds
    });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(newActions));
      localStorage.setItem('automflows_builder_mode_inserted_ids', JSON.stringify(Array.from(newInsertedIds)));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  markActionAsInserted: (actionId, nodeId) => {
    const state = get();
    const newActions = state.builderModeActions.map(action => 
      action.id === actionId ? { ...action, inserted: true, nodeId } : action
    );
    const newInsertedIds = new Set(state.builderModeInsertedActionIds);
    newInsertedIds.add(actionId);
    set({ 
      builderModeActions: newActions,
      builderModeInsertedActionIds: newInsertedIds
    });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(newActions));
      localStorage.setItem('automflows_builder_mode_inserted_ids', JSON.stringify(Array.from(newInsertedIds)));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  setBuilderModeModalMinimized: (minimized) => {
    set({ builderModeModalMinimized: minimized });
    try {
      localStorage.setItem('automflows_builder_mode_modal_minimized', String(minimized));
    } catch (error) {
      console.warn('Failed to save builder mode modal minimized to localStorage:', error);
    }
  },
  
  setBuilderModeModalPosition: (position) => {
    set({ builderModeModalPosition: position });
    try {
      if (position) {
        localStorage.setItem('automflows_builder_mode_modal_position', JSON.stringify(position));
      } else {
        localStorage.removeItem('automflows_builder_mode_modal_position');
      }
    } catch (error) {
      console.warn('Failed to save builder mode modal position to localStorage:', error);
    }
  },
  
  resetBuilderModeActions: () => {
    set({ 
      builderModeActions: [],
      builderModeInsertedActionIds: new Set<string>(),
      builderModeActive: false,
      builderModeModalMinimized: false,
      lastCompletedNodeId: null
    });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify([]));
      localStorage.setItem('automflows_builder_mode_inserted_ids', JSON.stringify([]));
      localStorage.setItem('automflows_builder_mode_modal_minimized', 'false');
    } catch (error) {
      console.warn('Failed to reset builder mode actions in localStorage:', error);
    }
  },
});
