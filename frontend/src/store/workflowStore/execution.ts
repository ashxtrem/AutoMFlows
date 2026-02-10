import { StateCreator } from 'zustand';
import { WorkflowStateCore } from './core';
import { NodeError } from './types';
import { ValidationError } from '../../utils/validation';

export interface ExecutionSlice {
  setExecutionStatus: (status: 'idle' | 'running' | 'completed' | 'error') => void;
  setExecutingNodeId: (nodeId: string | null) => void;
  resetExecution: () => void;
  setNodeError: (nodeId: string, error: NodeError) => void;
  clearNodeError: (nodeId: string) => void;
  clearAllNodeErrors: () => void;
  showErrorPopupForNode: (nodeId: string | null) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  clearValidationErrors: () => void;
}

export const createExecutionSlice: StateCreator<
  WorkflowStateCore & ExecutionSlice,
  [],
  [],
  ExecutionSlice
> = (set, get) => ({
  setExecutionStatus: (status) => set({ executionStatus: status }),
  
  setExecutingNodeId: (nodeId) => set({ executingNodeId: nodeId }),
  
  resetExecution: () => set({ executionStatus: 'idle', executingNodeId: null, failedNodes: new Map() }),
  
  setNodeError: (nodeId, error) => {
    const state = get();
    const newFailedNodes = new Map(state.failedNodes);
    newFailedNodes.set(nodeId, error);
    set({ failedNodes: newFailedNodes });
  },
  
  clearNodeError: (nodeId) => {
    const state = get();
    const newFailedNodes = new Map(state.failedNodes);
    newFailedNodes.delete(nodeId);
    set({ failedNodes: newFailedNodes });
  },
  
  clearAllNodeErrors: () => set({ failedNodes: new Map(), errorPopupNodeId: null }),
  
  showErrorPopupForNode: (nodeId) => {
    const state = get();
    // If nodeId is null, close the popup
    if (nodeId === null || nodeId === undefined) {
      set({ errorPopupNodeId: null });
      return;
    }
    // Only show popup if node has an error
    if (nodeId && state.failedNodes.has(nodeId)) {
      set({ errorPopupNodeId: nodeId });
    } else {
      set({ errorPopupNodeId: null });
    }
  },
  
  setValidationErrors: (errors) => {
    const validationErrorsMap = new Map<string, ValidationError[]>();
    // Group errors by nodeId
    for (const error of errors) {
      if (!validationErrorsMap.has(error.nodeId)) {
        validationErrorsMap.set(error.nodeId, []);
      }
      validationErrorsMap.get(error.nodeId)!.push(error);
    }
    set({ validationErrors: validationErrorsMap });
  },
  
  clearValidationErrors: () => set({ validationErrors: new Map() }),
});
