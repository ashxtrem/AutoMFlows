import { Node, Edge } from 'reactflow';
import { RecordedAction } from '@automflows/shared';
import { ValidationError } from '../../utils/validation';
import { WorkflowSnapshot, NodeError, Group } from './types';

export interface WorkflowStateCore {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedNodeIds: Set<string>;
  executionStatus: 'idle' | 'running' | 'completed' | 'error';
  executingNodeId: string | null;
  failedNodes: Map<string, NodeError>;
  validationErrors: Map<string, ValidationError[]>;
  errorPopupNodeId: string | null;
  canvasReloading: boolean;
  selectorFinderSessionId: string | null;
  selectorFinderActive: boolean;
  history: WorkflowSnapshot[];
  historyIndex: number;
  maxHistorySize: number;
  clipboard: Node | Node[] | null;
  navigateToFailedNode: (() => void) | null;
  edgesHidden: boolean;
  updatingEdgeId: string | string[] | null;
  breakpointEnabled: boolean;
  breakpointAt: 'pre' | 'post' | 'both';
  breakpointFor: 'all' | 'marked';
  pausedNodeId: string | null;
  pauseReason: 'wait-pause' | 'breakpoint' | null;
  pauseBreakpointAt: 'pre' | 'post' | 'both' | null;
  navigateToPausedNode: (() => void) | null;
  followModeEnabled: boolean;
  builderModeEnabled: boolean;
  builderModeActive: boolean;
  lastCompletedNodeId: string | null;
  builderModeActions: RecordedAction[];
  builderModeInsertedActionIds: Set<string>;
  builderModeModalMinimized: boolean;
  builderModeModalPosition: { x: number; y: number } | null;
  workflowFileName: string;
  hasUnsavedChanges: boolean;
  groups: Group[];
  selectedGroupId: string | null;
  fitViewRequested: boolean;
}

export function getInitialState(): WorkflowStateCore {
  const initialState: WorkflowSnapshot = { nodes: [], edges: [] };
  
  return {
    nodes: [],
    edges: [],
    selectedNode: null,
    selectedNodeIds: new Set<string>(),
    executionStatus: 'idle',
    executingNodeId: null,
    failedNodes: new Map(),
    validationErrors: new Map(),
    errorPopupNodeId: null,
    canvasReloading: false,
    selectorFinderSessionId: null,
    selectorFinderActive: false,
    history: [initialState],
    historyIndex: 0,
    maxHistorySize: 10,
    clipboard: null,
    navigateToFailedNode: null,
    edgesHidden: (() => {
      try {
        const saved = localStorage.getItem('reactflow-edges-hidden');
        return saved === 'true';
      } catch (error) {
        return false;
      }
    })(),
    updatingEdgeId: null,
    breakpointEnabled: (() => {
      try {
        const saved = localStorage.getItem('automflows_breakpoint_enabled');
        return saved === 'true';
      } catch (error) {
        return false;
      }
    })(),
    breakpointAt: (() => {
      try {
        const saved = localStorage.getItem('automflows_breakpoint_at');
        return (saved || 'pre') as 'pre' | 'post' | 'both';
      } catch (error) {
        return 'pre';
      }
    })(),
    breakpointFor: (() => {
      try {
        const saved = localStorage.getItem('automflows_breakpoint_for');
        return (saved || 'marked') as 'all' | 'marked';
      } catch (error) {
        return 'marked';
      }
    })(),
    pausedNodeId: null,
    pauseReason: null,
    pauseBreakpointAt: null,
    navigateToPausedNode: null,
    followModeEnabled: (() => {
      try {
        const saved = localStorage.getItem('automflows_follow_mode');
        return saved === 'true';
      } catch (error) {
        return false;
      }
    })(),
    builderModeEnabled: (() => {
      try {
        const saved = localStorage.getItem('automflows_builder_mode_enabled');
        return saved === 'true';
      } catch (error) {
        return false;
      }
    })(),
    builderModeActive: false,
    lastCompletedNodeId: null,
    builderModeActions: (() => {
      try {
        const saved = localStorage.getItem('automflows_builder_mode_actions');
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        return [];
      }
    })(),
    builderModeInsertedActionIds: (() => {
      try {
        const saved = localStorage.getItem('automflows_builder_mode_inserted_ids');
        return saved ? new Set(JSON.parse(saved)) : new Set<string>();
      } catch (error) {
        return new Set<string>();
      }
    })(),
    builderModeModalMinimized: (() => {
      try {
        const saved = localStorage.getItem('automflows_builder_mode_modal_minimized');
        return saved === 'true';
      } catch (error) {
        return false;
      }
    })(),
    builderModeModalPosition: (() => {
      try {
        const saved = localStorage.getItem('automflows_builder_mode_modal_position');
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        return null;
      }
    })(),
    workflowFileName: (() => {
      try {
        const saved = localStorage.getItem('automflows_workflow_filename');
        return saved || 'Untitled Workflow';
      } catch (error) {
        return 'Untitled Workflow';
      }
    })(),
    hasUnsavedChanges: (() => {
      try {
        const saved = localStorage.getItem('automflows_workflow_unsaved_changes');
        return saved === 'true';
      } catch (error) {
        return false;
      }
    })(),
    groups: [],
    selectedGroupId: null,
    fitViewRequested: false,
  };
}
