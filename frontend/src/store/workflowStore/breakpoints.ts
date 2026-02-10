import { StateCreator } from 'zustand';
import { WorkflowStoreStateWithNodes } from './slices';

export interface BreakpointsSlice {
  toggleBreakpoint: (nodeId: string | string[]) => void;
  setBreakpointSettings: (settings: { enabled?: boolean; breakpointAt?: 'pre' | 'post' | 'both'; breakpointFor?: 'all' | 'marked' }) => void;
  setPausedNode: (nodeId: string | null, reason: 'wait-pause' | 'breakpoint' | null, breakpointAt?: 'pre' | 'post' | 'both' | null) => void;
  setNavigateToPausedNode: (fn: (() => void) | null) => void;
  setFollowModeEnabled: (enabled: boolean) => void;
  setSelectorFinderSession: (sessionId: string | null) => void;
  setSelectorFinderActive: (active: boolean) => void;
}

export const createBreakpointsSlice: StateCreator<
  WorkflowStoreStateWithNodes & BreakpointsSlice,
  [],
  [],
  BreakpointsSlice
> = (set, get) => ({
  toggleBreakpoint: (nodeId) => {
    const state = get();
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    const nodes = state.nodes.filter((n) => nodeIds.includes(n.id));
    
    // Determine toggle state: if all have breakpoints, remove all; otherwise add to all
    const allHaveBreakpoints = nodes.length > 0 && nodes.every((n) => n.data.breakpoint === true);
    const newBreakpointState = !allHaveBreakpoints;
    
    nodes.forEach((node) => {
      get().updateNodeData(node.id, { breakpoint: newBreakpointState });
    });
    
    setTimeout(() => get().saveToHistory(), 100);
  },
  
  setBreakpointSettings: (settings) => {
    const updates: any = {};
    if (settings.enabled !== undefined) {
      updates.breakpointEnabled = settings.enabled;
      try {
        localStorage.setItem('automflows_breakpoint_enabled', String(settings.enabled));
      } catch (error) {
        console.warn('Failed to save breakpoint enabled to localStorage:', error);
      }
    }
    if (settings.breakpointAt !== undefined) {
      updates.breakpointAt = settings.breakpointAt;
      try {
        localStorage.setItem('automflows_breakpoint_at', settings.breakpointAt);
      } catch (error) {
        console.warn('Failed to save breakpoint at to localStorage:', error);
      }
    }
    if (settings.breakpointFor !== undefined) {
      updates.breakpointFor = settings.breakpointFor;
      try {
        localStorage.setItem('automflows_breakpoint_for', settings.breakpointFor);
      } catch (error) {
        console.warn('Failed to save breakpoint for to localStorage:', error);
      }
    }
    set(updates);
  },
  
  setPausedNode: (nodeId: string | null, reason: 'wait-pause' | 'breakpoint' | null, breakpointAt?: 'pre' | 'post' | 'both' | null) => {
    set({ 
      pausedNodeId: nodeId, 
      pauseReason: reason,
      pauseBreakpointAt: breakpointAt || null,
    });
  },
  
  setNavigateToPausedNode: (fn) => set({ navigateToPausedNode: fn }),
  
  setFollowModeEnabled: (enabled) => {
    set({ followModeEnabled: enabled });
    try {
      localStorage.setItem('automflows_follow_mode', String(enabled));
    } catch (error) {
      console.warn('Failed to save follow mode to localStorage:', error);
    }
  },
  
  setSelectorFinderSession: (sessionId) => {
    set({ selectorFinderSessionId: sessionId });
  },
  
  setSelectorFinderActive: (active) => {
    set({ selectorFinderActive: active });
  },
});
