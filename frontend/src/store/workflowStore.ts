import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { BaseNode as WorkflowNode, Edge as WorkflowEdge, NodeType } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  executionStatus: 'idle' | 'running' | 'completed' | 'error';
  executingNodeId: string | null;
  
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNode: (node: Node | null) => void;
  addNode: (type: NodeType | string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  updateNodeDimensions: (nodeId: string, width: number, height?: number) => void;
  setExecutionStatus: (status: 'idle' | 'running' | 'completed' | 'error') => void;
  setExecutingNodeId: (nodeId: string | null) => void;
  resetExecution: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  executionStatus: 'idle',
  executingNodeId: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    const updatedNodes = applyNodeChanges(changes, get().nodes);
    const selectedNode = get().selectedNode;
    const updatedSelectedNode = selectedNode 
      ? updatedNodes.find((node) => node.id === selectedNode.id) || null
      : null;
    
    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    // Check if target already has a connection
    const existingEdge = get().edges.find((e) => e.target === connection.target);
    if (existingEdge && connection.targetHandle === 'input') {
      // Remove existing connection to input port
      set({
        edges: get().edges.filter((e) => !(e.target === connection.target && e.targetHandle === 'input')),
      });
    }
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  setSelectedNode: (node) => {
    if (!node) {
      set({ selectedNode: null });
      return;
    }
    // Find the node from the nodes array to ensure we have the latest version
    const latestNode = get().nodes.find((n) => n.id === node.id) || node;
    set({ selectedNode: latestNode });
  },

  addNode: (type, position) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'custom',
      position,
      data: {
        type,
        label: getNodeLabel(type),
        ...getDefaultNodeData(type),
      },
    };
    set({
      nodes: [...get().nodes, newNode],
    });
  },

  updateNodeData: (nodeId, data) => {
    const updatedNodes = get().nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    );
    const selectedNode = get().selectedNode;
    const updatedSelectedNode = selectedNode && selectedNode.id === nodeId
      ? updatedNodes.find((node) => node.id === nodeId) || null
      : selectedNode;
    
    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    });
  },

  updateNodeDimensions: (nodeId, width, height) => {
    const updatedNodes = get().nodes.map((node) =>
      node.id === nodeId 
        ? { 
            ...node, 
            width,
            height,
            data: { ...node.data, width, height }
          } 
        : node
    );
    const selectedNode = get().selectedNode;
    const updatedSelectedNode = selectedNode && selectedNode.id === nodeId
      ? updatedNodes.find((node) => node.id === nodeId) || null
      : selectedNode;
    
    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    });
  },

  setExecutionStatus: (status) => set({ executionStatus: status }),
  setExecutingNodeId: (nodeId) => set({ executingNodeId: nodeId }),
  resetExecution: () => set({ executionStatus: 'idle', executingNodeId: null }),
}));

function getNodeLabel(type: NodeType | string): string {
  // Check if it's a built-in node type (check if value exists in enum values)
  if (Object.values(NodeType).includes(type as NodeType)) {
    const labels: Record<NodeType, string> = {
      [NodeType.START]: 'Start',
      [NodeType.OPEN_BROWSER]: 'Open Browser',
      [NodeType.NAVIGATE]: 'Navigate',
      [NodeType.CLICK]: 'Click',
      [NodeType.TYPE]: 'Type',
      [NodeType.GET_TEXT]: 'Get Text',
      [NodeType.SCREENSHOT]: 'Screenshot',
      [NodeType.WAIT]: 'Wait',
      [NodeType.JAVASCRIPT_CODE]: 'JavaScript Code',
      [NodeType.LOOP]: 'Loop',
    };
    return labels[type as NodeType] || type;
  }
  
  // Check if it's a plugin node
  const nodeDef = frontendPluginRegistry.getNodeDefinition(type);
  if (nodeDef) {
    return nodeDef.label;
  }
  
  return type;
}

function getDefaultNodeData(type: NodeType | string): any {
  // Check if it's a built-in node type (check if value exists in enum values)
  if (Object.values(NodeType).includes(type as NodeType)) {
    const defaults: Record<NodeType, any> = {
      [NodeType.START]: {},
      [NodeType.OPEN_BROWSER]: { headless: true, viewportWidth: 1280, viewportHeight: 720 },
      [NodeType.NAVIGATE]: { url: '' },
      [NodeType.CLICK]: { selector: '', selectorType: 'css', timeout: 30000 },
      [NodeType.TYPE]: { selector: '', selectorType: 'css', text: '', timeout: 30000 },
      [NodeType.GET_TEXT]: { selector: '', selectorType: 'css', outputVariable: 'text', timeout: 30000 },
      [NodeType.SCREENSHOT]: { fullPage: false },
      [NodeType.WAIT]: { waitType: 'timeout', value: 1000, timeout: 30000 },
      [NodeType.JAVASCRIPT_CODE]: { code: '// Your code here\nreturn context.data;' },
      [NodeType.LOOP]: { arrayVariable: '' },
    };
    return defaults[type as NodeType] || {};
  }
  
  // Check if it's a plugin node
  const nodeDef = frontendPluginRegistry.getNodeDefinition(type);
  if (nodeDef && nodeDef.defaultData) {
    return nodeDef.defaultData;
  }
  
  return {};
}

