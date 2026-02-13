// Combined type for all slices - this allows slices to access methods from other slices
import { WorkflowStateCore } from './core';
import { HistorySlice } from './history';
import { EdgesSlice } from './edges';
import { GroupsSlice } from './groups';
import { ExecutionSlice } from './execution';
import { BreakpointsSlice } from './breakpoints';
import { BuilderModeSlice } from './builderMode';
import { FileManagementSlice } from './fileManagement';
import { ArrangementSlice } from './arrangement';
import { PropertyInputSlice } from './propertyInput';
import { NodesSlice } from './nodes';

// Combined type that includes all slices
export type WorkflowStoreState = WorkflowStateCore &
  HistorySlice &
  EdgesSlice &
  GroupsSlice &
  ExecutionSlice &
  BreakpointsSlice &
  BuilderModeSlice &
  FileManagementSlice &
  ArrangementSlice &
  PropertyInputSlice &
  NodesSlice;

// Alias for backward compatibility - slices can use this type
export type WorkflowStoreStateWithNodes = WorkflowStoreState;
