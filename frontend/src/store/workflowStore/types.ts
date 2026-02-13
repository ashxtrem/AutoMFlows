import { Node, Edge } from 'reactflow';
import { PageDebugInfo } from '@automflows/shared';

export interface Group {
  id: string;
  name: string;
  nodeIds: string[];
  position: { x: number; y: number };
  width: number;
  height: number;
  borderColor?: string;
  manuallyResized?: boolean; // Flag to prevent automatic bounds recalculation
}

export interface WorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
  groups?: Group[];
}

export interface NodeError {
  message: string;
  traceLogs: string[];
  debugInfo?: PageDebugInfo;
}
