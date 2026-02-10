import { createWithEqualityFn } from 'zustand/traditional';
import { getInitialState } from './core';
import { createHistorySlice } from './history';
import { createEdgesSlice } from './edges';
import { createGroupsSlice } from './groups';
import { createExecutionSlice } from './execution';
import { createBreakpointsSlice } from './breakpoints';
import { createBuilderModeSlice } from './builderMode';
import { createFileManagementSlice } from './fileManagement';
import { createArrangementSlice } from './arrangement';
import { createPropertyInputSlice } from './propertyInput';
import { createNodesSlice } from './nodes';
import { WorkflowStoreState } from './slices';

// Create the combined store using Zustand's slices pattern
export const useWorkflowStore = createWithEqualityFn<WorkflowStoreState>((...a) => {
  // Start with initial state
  const initialState = getInitialState();
  
  // Combine all slices using spread operator
  return {
    ...initialState,
    ...createHistorySlice(...a),
    ...createEdgesSlice(...a),
    ...createGroupsSlice(...a),
    ...createExecutionSlice(...a),
    ...createBreakpointsSlice(...a),
    ...createBuilderModeSlice(...a),
    ...createFileManagementSlice(...a),
    ...createArrangementSlice(...a),
    ...createPropertyInputSlice(...a),
    ...createNodesSlice(...a),
  };
});

// Re-export utilities
export { getNodeLabel, getDefaultNodeData } from './utils';
export * from './types';
