import { create } from 'zustand';
import { Workflow, ExecutionStatus } from '@automflows/shared';
import { liteGraphToWorkflow, workflowToLiteGraph } from '../utils/litegraphAdapter';
import { getLiteGraph } from '../utils/litegraphLoader';

// Import node types to register them
import '../nodes/StartNode';

interface WorkflowState {
  // LiteGraph graph instance
  graph: any | null;
  
  // Selected node
  selectedNode: any | null;
  
  // Execution state
  executionStatus: ExecutionStatus;
  executionId: string | null;
  executingNodeId: string | null;
  error: string | null;
  
  // Actions
  setGraph: (graph: any | null) => void;
  setSelectedNode: (node: any | null) => void;
  setExecutionStatus: (status: ExecutionStatus) => void;
  setExecutionId: (id: string | null) => void;
  setExecutingNodeId: (nodeId: string | null) => void;
  setError: (error: string | null) => void;
  resetExecution: () => void;
  
  // Workflow conversion
  getWorkflow: () => Workflow | null;
  loadWorkflow: (workflow: Workflow) => void;
  
  // Save/Load
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  graph: null,
  selectedNode: null,
  executionStatus: ExecutionStatus.IDLE,
  executionId: null,
  executingNodeId: null,
  error: null,

  setGraph: (graph) => set({ graph }),
  
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  setExecutionStatus: (status) => set({ executionStatus: status }),
  
  setExecutionId: (id) => set({ executionId: id }),
  
  setExecutingNodeId: (nodeId) => set({ executingNodeId: nodeId }),
  
  setError: (error) => set({ error }),
  
  resetExecution: () => set({
    executionStatus: ExecutionStatus.IDLE,
    executionId: null,
    executingNodeId: null,
    error: null,
  }),

  getWorkflow: () => {
    const { graph } = get();
    if (!graph) return null;
    
    // Serialize LiteGraph graph to JSON
    const lgData = graph.serialize();
    // Convert to backend Workflow format
    return liteGraphToWorkflow(lgData);
  },

  loadWorkflow: (workflow) => {
    const { graph } = get();
    const LiteGraph = getLiteGraph();
    const LGraph = LiteGraph.LGraph;
    
    if (!graph) {
      // Create new graph if none exists
      const newGraph = new LGraph();
      set({ graph: newGraph });
      const lgData = workflowToLiteGraph(workflow);
      newGraph.configure(lgData);
      newGraph.start();
      return;
    }
    
    // Convert backend Workflow to LiteGraph format
    const lgData = workflowToLiteGraph(workflow);
    // Load into graph
    graph.configure(lgData);
    graph.start();
  },

  saveToLocalStorage: () => {
    const workflow = get().getWorkflow();
    if (!workflow) return;
    
    try {
      localStorage.setItem('automflows-workflow-litegraph', JSON.stringify(workflow));
    } catch (error) {
      console.error('Failed to save workflow to localStorage:', error);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const stored = localStorage.getItem('automflows-workflow-litegraph');
      if (!stored) return null;
      
      const workflow = JSON.parse(stored) as Workflow;
      get().loadWorkflow(workflow);
      return workflow;
    } catch (error) {
      console.error('Failed to load workflow from localStorage:', error);
      return null;
    }
  },
}));
