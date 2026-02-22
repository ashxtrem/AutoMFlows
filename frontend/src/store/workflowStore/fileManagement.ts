import { StateCreator } from 'zustand';
import { WorkflowMetadata } from '@automflows/shared';
import { WorkflowStateCore } from './core';

export interface FileManagementSlice {
  setWorkflowFileName: (fileName: string) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setWorkflowMetadata: (metadata: WorkflowMetadata | undefined) => void;
}

export const createFileManagementSlice: StateCreator<
  WorkflowStateCore & FileManagementSlice,
  [],
  [],
  FileManagementSlice
> = (set) => ({
  setWorkflowFileName: (fileName) => {
    set({ workflowFileName: fileName });
    try {
      localStorage.setItem('automflows_workflow_filename', fileName);
    } catch (error) {
      console.warn('Failed to save workflow filename to localStorage:', error);
    }
  },
  
  setHasUnsavedChanges: (hasChanges) => {
    set({ hasUnsavedChanges: hasChanges });
    try {
      localStorage.setItem('automflows_workflow_unsaved_changes', String(hasChanges));
    } catch (error) {
      console.warn('Failed to save unsaved changes flag to localStorage:', error);
    }
  },

  setWorkflowMetadata: (metadata) => {
    set({ workflowMetadata: metadata });
  },
});
