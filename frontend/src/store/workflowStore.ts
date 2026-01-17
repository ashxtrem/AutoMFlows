import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { NodeType, PropertyDataType, PageDebugInfo } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
import { getNodeProperties, getPropertyInputHandleId } from '../utils/nodeProperties';
import { ValidationError } from '../utils/validation';

// Type conversion helper (frontend version)
function canConvertType(sourceType: PropertyDataType, targetType: PropertyDataType): boolean {
  // Exact match always allowed
  if (sourceType === targetType) {
    return true;
  }
  // Numeric promotion allowed: int → float → double
  if (sourceType === PropertyDataType.INT && targetType === PropertyDataType.FLOAT) {
    return true;
  }
  if (sourceType === PropertyDataType.INT && targetType === PropertyDataType.DOUBLE) {
    return true;
  }
  if (sourceType === PropertyDataType.FLOAT && targetType === PropertyDataType.DOUBLE) {
    return true;
  }
  return false;
}

interface WorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface NodeError {
  message: string;
  traceLogs: string[];
  debugInfo?: PageDebugInfo;
}

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  executionStatus: 'idle' | 'running' | 'completed' | 'error';
  executingNodeId: string | null;
  failedNodes: Map<string, NodeError>; // Track failed nodes with error details
  validationErrors: Map<string, ValidationError[]>; // Track validation errors by node ID
  errorPopupNodeId: string | null; // Which failed node's error popup is currently shown
  canvasReloading: boolean; // Global loader state for canvas reload
  
  // Undo/Redo
  history: WorkflowSnapshot[];
  historyIndex: number;
  maxHistorySize: number;
  
  // Clipboard
  clipboard: Node | null;
  
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onConnectStart: (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null }) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent) => void;
  setSelectedNode: (node: Node | null) => void;
  addNode: (type: NodeType | string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  updateNodeDimensions: (nodeId: string, width: number, height?: number) => void;
  setExecutionStatus: (status: 'idle' | 'running' | 'completed' | 'error') => void;
  setExecutingNodeId: (nodeId: string | null) => void;
  resetExecution: () => void;
  setNodeError: (nodeId: string, error: NodeError) => void;
  clearNodeError: (nodeId: string) => void;
  clearAllNodeErrors: () => void;
  showErrorPopupForNode: (nodeId: string | null) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  clearValidationErrors: () => void;
  
  // Undo/Redo methods
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Copy/Paste/Duplicate
  copyNode: (nodeId: string) => void;
  pasteNode: (position: { x: number; y: number }) => void;
  duplicateNode: (nodeId: string) => void;
  
  // Node operations
  renameNode: (nodeId: string, label: string) => void;
  deleteNode: (nodeId: string) => void;
  toggleBypass: (nodeId: string) => void;
  toggleMinimize: (nodeId: string) => void;
  togglePin: (nodeId: string) => void;
  setNodeColor: (nodeId: string, borderColor?: string, backgroundColor?: string) => void;
  autoResizeNode: (nodeId: string) => void;
  
  // Connection operations
  removeNodeConnections: (nodeId: string) => void;
  onEdgeUpdate: (oldEdge: Edge, newConnection: Connection) => void;
  
  // Property input conversion
  convertPropertyToInput: (nodeId: string, propertyName: string) => void;
  convertInputToProperty: (nodeId: string, propertyName: string) => void;
  
  // Node reload
  reloadNode: (nodeId: string) => void;
  
  // Failed node navigation
  navigateToFailedNode: (() => void) | null;
  setNavigateToFailedNode: (fn: (() => void) | null) => void;
  
  // Edge visibility
  edgesHidden: boolean;
  setEdgesHidden: (hidden: boolean) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => {
  const initialState: WorkflowSnapshot = { nodes: [], edges: [] };
  return {
    nodes: [],
    edges: [],
    selectedNode: null,
    executionStatus: 'idle',
    executingNodeId: null,
    failedNodes: new Map(),
    validationErrors: new Map(),
    errorPopupNodeId: null,
    canvasReloading: false,
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

  setNodes: (nodes) => {
    const state = get();
    // Clear validation errors when nodes are set directly (e.g., when loading a workflow)
    if (state.validationErrors.size > 0) {
      set({ nodes, validationErrors: new Map() });
    } else {
      set({ nodes });
    }
  },
  setEdges: (edges) => {
    const state = get();
    // Clear validation errors when edges are set directly (e.g., when loading a workflow)
    if (state.validationErrors.size > 0) {
      set({ edges, validationErrors: new Map() });
    } else {
      set({ edges });
    }
  },

  onNodesChange: (changes) => {
    const state = get();
    
    // Clear validation errors when nodes change (validation state may become stale)
    if (state.validationErrors.size > 0) {
      set({ validationErrors: new Map() });
    }
    
    // Filter out dimension changes from ReactFlow if we have explicit dimensions set
    // This prevents ReactFlow from overriding our manual resize dimensions
    const filteredChanges = changes.filter((change) => {
      if (change.type === 'dimensions' && change.id) {
        const node = state.nodes.find(n => n.id === change.id);
        // If node has explicit width/height set, ignore ReactFlow's dimension changes
        if (node && (node.data.width !== undefined || node.data.height !== undefined)) {
          return false; // Filter out this dimension change
        }
      }
      // Filter out changes that don't actually modify content
      // ReactFlow sometimes sends changes that don't actually change anything
      if (change.type === 'select' && change.id) {
        const node = state.nodes.find(n => n.id === change.id);
        // If node is already in the selected state, ignore the change
        if (node && node.selected === (change.selected !== false)) {
          return false; // Filter out redundant select changes
        }
      }
      return true; // Keep all other changes
    });
    
    // If all changes were filtered out, don't update anything
    if (filteredChanges.length === 0) {
      return;
    }
    
    const updatedNodes = applyNodeChanges(filteredChanges, state.nodes);
    
    // Check if nodes actually changed by comparing references AND content
    // applyNodeChanges should preserve references when possible, but we need to verify
    let nodesChanged = false;
    if (updatedNodes.length !== state.nodes.length) {
      nodesChanged = true;
    } else {
      // Check if any node reference changed OR if content actually changed
      for (let i = 0; i < updatedNodes.length; i++) {
        const updatedNode = updatedNodes[i];
        const originalNode = state.nodes[i];
        
        // If reference changed, check if content actually changed
        if (updatedNode !== originalNode) {
          // Compare by content: ID, position, selected state, and data
          const contentChanged = 
            updatedNode.id !== originalNode.id ||
            updatedNode.position.x !== originalNode.position.x ||
            updatedNode.position.y !== originalNode.position.y ||
            updatedNode.selected !== originalNode.selected ||
            JSON.stringify(updatedNode.data) !== JSON.stringify(originalNode.data);
          
          if (contentChanged) {
            nodesChanged = true;
            break;
          }
          // If reference changed but content is the same, don't update
          // This prevents ReactFlow from triggering updates when it recreates node objects
        }
      }
    }
    
    // Only update if nodes actually changed
    if (!nodesChanged) {
      return;
    }
    
    // Ensure explicit dimensions are preserved (in case any slipped through)
    // Only create new objects if dimensions actually need to be preserved
    let needsDimensionPreservation = false;
    const finalNodes = updatedNodes.map((node, index) => {
      const originalNode = state.nodes[index];
      // If node has explicit width/height set, preserve them
      if (originalNode && (originalNode.data.width !== undefined || originalNode.data.height !== undefined)) {
        // Only create new object if dimensions actually changed
        if (node.width !== originalNode.width || node.height !== originalNode.height) {
          needsDimensionPreservation = true;
          return {
            ...node,
            width: originalNode.width,
            height: originalNode.height,
          };
        }
      }
      return node;
    });
    
    // If no dimension preservation was needed, use updatedNodes directly to preserve references
    const nodesToSet = needsDimensionPreservation ? finalNodes : updatedNodes;
    
    const selectedNode = state.selectedNode;
    const updatedSelectedNode = selectedNode 
      ? nodesToSet.find((node) => node.id === selectedNode.id) || null
      : null;
    
    set({
      nodes: nodesToSet,
      selectedNode: updatedSelectedNode,
    });
    
    // Check if this is a significant change (not just position updates)
    const significantChange = changes.some(
      (change) => change.type === 'add' || change.type === 'remove'
    );
    
    // Save to history for significant changes (debounced)
    if (significantChange) {
      setTimeout(() => get().saveToHistory(), 100);
    }
  },

  onEdgesChange: (changes) => {
    const state = get();
    
    // Clear validation errors when edges change (validation state may become stale)
    if (state.validationErrors.size > 0) {
      set({ validationErrors: new Map() });
    }
    
    const updatedEdges = applyEdgeChanges(changes, state.edges);
    set({
      edges: updatedEdges,
    });
    // Save to history for edge changes (debounced)
    setTimeout(() => get().saveToHistory(), 100);
  },

  onConnect: (connection) => {
    const state = get();
    
    // Validate connection
    if (!connection.source || !connection.target) {
      return;
    }
    
    // Prevent self-connections
    if (connection.source === connection.target) {
      return;
    }
    
    // Type validation for property input connections
    if (connection.targetHandle && connection.targetHandle !== 'driver') {
      // This is a property input connection - validate types
      const targetNode = state.nodes.find(n => n.id === connection.target);
      const sourceNode = state.nodes.find(n => n.id === connection.source);
      
      if (targetNode && sourceNode) {
        // Extract property name from handle ID (e.g., "timeout-input" -> "timeout")
        const propertyName = connection.targetHandle.replace('-input', '');
        const targetProperties = getNodeProperties(targetNode.data.type);
        const targetProperty = targetProperties.find(p => p.name === propertyName);
        
        // Determine source output type
        let sourceType: PropertyDataType;
        if (sourceNode.data.type === NodeType.INT_VALUE) {
          sourceType = PropertyDataType.INT;
        } else if (sourceNode.data.type === NodeType.STRING_VALUE) {
          sourceType = PropertyDataType.STRING;
        } else if (sourceNode.data.type === NodeType.BOOLEAN_VALUE) {
          sourceType = PropertyDataType.BOOLEAN;
        } else if (sourceNode.data.type === NodeType.INPUT_VALUE) {
          // Get dataType from INPUT_VALUE node
          sourceType = sourceNode.data.dataType || PropertyDataType.STRING;
        } else {
          // For other nodes, infer from output or default to string
          sourceType = PropertyDataType.STRING;
        }
        
          // Validate type compatibility
          if (targetProperty) {
            const targetType = targetProperty.dataType;
            if (!canConvertType(sourceType, targetType)) {
              alert(`Type mismatch: Cannot connect ${sourceType} to ${targetType}. Only numeric promotion (int→float→double) is allowed.`);
              return;
            }
          }
      }
    }
    
    // Check if target already has a connection to the same handle
    const edgesToRemove = state.edges.filter((e) => 
      e.target === connection.target && 
      e.targetHandle === connection.targetHandle
    );
    
    // Remove old connections before adding new one
    const finalEdges = state.edges.filter((e) => 
      !edgesToRemove.some((edgeToRemove) => edgeToRemove.id === e.id)
    );
    
    set({
      edges: addEdge(connection, finalEdges),
    });
    setTimeout(() => get().saveToHistory(), 100);
  },

  onConnectStart: (_event, _params) => {
    // No special handling needed - ReactFlow handles connection start
  },

  onConnectEnd: (_event) => {
    // No special handling needed - ReactFlow handles connection end
  },

  onEdgeUpdate: (oldEdge, newConnection) => {
    const state = get();
    
    // Validate new connection
    if (!newConnection.source || !newConnection.target) {
      return;
    }
    
    // Prevent self-connections
    if (newConnection.source === newConnection.target) {
      return;
    }
    
    // Remove old edge and create new one with updated target
    const updatedEdges = state.edges.map((edge) => {
      if (edge.id === oldEdge.id) {
        return {
          ...edge,
          target: newConnection.target!,
          targetHandle: newConnection.targetHandle || edge.targetHandle,
        };
      }
      return edge;
    });
    
    // Remove any conflicting edges on the new target handle
    const finalEdges = updatedEdges.filter((edge) => {
      if (edge.target === newConnection.target && edge.targetHandle === newConnection.targetHandle) {
        return edge.id === oldEdge.id; // Keep only the updated edge
      }
      return true;
    });
    
    set({ edges: finalEdges });
    setTimeout(() => get().saveToHistory(), 100);
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
    setTimeout(() => get().saveToHistory(), 100);
  },

  updateNodeData: (nodeId, data) => {
    // Show global loader
    set({ canvasReloading: true });
    
    const state = get();
    const updatedNodes = state.nodes.map((node) => {
      if (node.id === nodeId) {
        // Create a completely new node object to ensure ReactFlow detects the change
        // The spread operator creates a new reference, which ReactFlow uses for change detection
        return { 
          ...node, 
          data: { ...node.data, ...data }
        };
      }
      return node;
    });
    const selectedNode = state.selectedNode;
    const updatedSelectedNode = selectedNode && selectedNode.id === nodeId
      ? updatedNodes.find((node) => node.id === nodeId) || null
      : selectedNode;
    
    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    });
    
      // Hide loader after a short delay to allow ReactFlow to reload
      setTimeout(() => {
        set({ canvasReloading: false });
      }, 100);
    
    // Don't auto-save to history - let calling code decide when to save
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
    // Don't auto-save to history for resize - too frequent
  },

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

  // Undo/Redo implementation
  saveToHistory: () => {
    const state = get();
    const snapshot: WorkflowSnapshot = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
    };
    
    // Remove any history after current index (if we're not at the end)
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    
    // Check if this snapshot is different from the last one
    const lastSnapshot = newHistory[newHistory.length - 1];
    const isDifferent = !lastSnapshot || 
      JSON.stringify(lastSnapshot.nodes) !== JSON.stringify(snapshot.nodes) ||
      JSON.stringify(lastSnapshot.edges) !== JSON.stringify(snapshot.edges);
    
    if (isDifferent) {
      newHistory.push(snapshot);
      
      // Limit history size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
      } else {
        // Only increment index if we're not trimming
        set({ historyIndex: newHistory.length - 1 });
      }
      
      set({ history: newHistory });
    }
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        historyIndex: newIndex,
        selectedNode: null,
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        historyIndex: newIndex,
        selectedNode: null,
      });
    }
  },

  canUndo: () => {
    return get().historyIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  // Copy/Paste/Duplicate
  copyNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node) {
      set({ clipboard: JSON.parse(JSON.stringify(node)) });
    }
  },

  pasteNode: (position) => {
    const clipboard = get().clipboard;
    if (!clipboard) return;
    
    const newNode: Node = {
      ...JSON.parse(JSON.stringify(clipboard)),
      id: `${clipboard.data.type}-${Date.now()}`,
      position,
    };
    
    set({
      nodes: [...get().nodes, newNode],
    });
    setTimeout(() => get().saveToHistory(), 100);
  },

  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    
    const newNode: Node = {
      ...JSON.parse(JSON.stringify(node)),
      id: `${node.data.type}-${Date.now()}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
    };
    
    set({
      nodes: [...get().nodes, newNode],
    });
    setTimeout(() => get().saveToHistory(), 100);
  },

  // Node operations
  renameNode: (nodeId, label) => {
    get().updateNodeData(nodeId, { label });
    setTimeout(() => get().saveToHistory(), 100);
  },

  deleteNode: (nodeId) => {
    const state = get();
    set({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
    });
    setTimeout(() => get().saveToHistory(), 100);
  },

  toggleBypass: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node) {
      const currentBypass = node.data.bypass || false;
      get().updateNodeData(nodeId, { bypass: !currentBypass });
      setTimeout(() => get().saveToHistory(), 100);
    }
  },

  toggleMinimize: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node) {
      const currentMinimized = node.data.isMinimized || false;
      get().updateNodeData(nodeId, { isMinimized: !currentMinimized });
      setTimeout(() => get().saveToHistory(), 100);
    }
  },

  togglePin: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node) {
      const currentPinned = node.data.isPinned || false;
      get().updateNodeData(nodeId, { isPinned: !currentPinned });
      setTimeout(() => get().saveToHistory(), 100);
    }
  },

  setNodeColor: (nodeId, _borderColor, backgroundColor) => {
    const updates: any = {};
    // Only set backgroundColor (borderColor is no longer customizable)
    if (backgroundColor !== undefined) updates.backgroundColor = backgroundColor;
    get().updateNodeData(nodeId, updates);
    setTimeout(() => get().saveToHistory(), 100);
  },

  autoResizeNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    
    // Calculate content size based on properties
    // This is a simplified version - in practice, you'd measure actual DOM
    const properties = node.data;
    let maxWidth = 200;
    let maxHeight = 100;
    
    // Estimate width based on content
    const propertyCount = Object.keys(properties).filter(
      (key) => !['type', 'label', 'isExecuting', 'width', 'height', 'borderColor', 'backgroundColor', 'bypass', 'isMinimized'].includes(key)
    ).length;
    
    if (propertyCount > 0) {
      maxWidth = Math.max(250, propertyCount * 50);
      maxHeight = Math.max(150, propertyCount * 40 + 50);
    }
    
    get().updateNodeDimensions(nodeId, maxWidth, maxHeight);
    setTimeout(() => get().saveToHistory(), 100);
  },

  // Connection operations
  removeNodeConnections: (nodeId) => {
    const state = get();
    const updatedEdges = state.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    
    if (updatedEdges.length !== state.edges.length) {
      set({ edges: updatedEdges });
      setTimeout(() => get().saveToHistory(), 100);
    }
  },

  // Property input conversion
  convertPropertyToInput: (nodeId, propertyName) => {
    const state = get();
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const handleId = `${propertyName}-input`;
    const inputConnections = node.data._inputConnections || {};
    
    // Store the old value before clearing it
    const oldValue = node.data[propertyName];
    
    // Mark property as input connection and store old value
    inputConnections[propertyName] = {
      isInput: true,
      handleId,
      oldValue, // Store old value for display in properties tab
    };

    // Clear the property value when converting to input
    const updates: any = {
      _inputConnections: inputConnections,
      [propertyName]: null, // Set property value to null
    };

    get().updateNodeData(nodeId, updates);
    setTimeout(() => get().saveToHistory(), 100);
  },

  convertInputToProperty: (nodeId, propertyName) => {
    const state = get();
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const inputConnections = { ...(node.data._inputConnections || {}) };
    const connectionInfo = inputConnections[propertyName];
    const oldValue = connectionInfo?.oldValue; // Get stored old value
    
    delete inputConnections[propertyName];

    // Remove any edges connected to this property input handle
    const handleId = `${propertyName}-input`;
    const updatedEdges = state.edges.filter(
      (e) => !(e.target === nodeId && e.targetHandle === handleId)
    );

    // Restore old value if it exists, otherwise keep it as null
    const updates: any = {
      _inputConnections: Object.keys(inputConnections).length > 0 ? inputConnections : undefined,
    };
    
    // Restore the old value when converting back to property
    if (oldValue !== undefined) {
      updates[propertyName] = oldValue;
    }

    get().updateNodeData(nodeId, updates);
    
    if (updatedEdges.length !== state.edges.length) {
      set({ edges: updatedEdges });
    }
    
    setTimeout(() => get().saveToHistory(), 100);
  },

  reloadNode: (nodeId) => {
    const state = get();
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const nodeType = node.data.type;
    const defaultData = getDefaultNodeData(nodeType);
    const defaultLabel = getNodeLabel(nodeType);
    
    // Remove all input connections (property inputs only, preserve driver connections)
    const inputConnections = node.data._inputConnections || {};
    const propertyNames = Object.keys(inputConnections);
    
    // Remove edges connected to property input handles (but NOT driver connections)
    const handleIds = propertyNames.map(prop => getPropertyInputHandleId(prop));
    const updatedEdges = state.edges.filter(
      (e) => !(e.target === nodeId && handleIds.includes(e.targetHandle || ''))
    );
    
    // Reset node data to defaults - only preserve position, reset everything else
    const resetData = {
      ...defaultData,
      type: nodeType,
      label: defaultLabel, // Reset to default label
      // Remove width/height to reset to auto-sizing
      // Remove all custom properties
      backgroundColor: undefined,
      borderColor: undefined,
      bypass: undefined,
      isMinimized: undefined,
      _inputConnections: undefined,
    };
    
    // Ensure switch node has defaultCase if it's missing
    if (nodeType === 'switch.switch' && (!resetData.defaultCase || !resetData.defaultCase.label)) {
      resetData.defaultCase = { label: 'Default' };
    }
    
    // Reset node completely - data, dimensions, and custom properties
    const updatedNodes = state.nodes.map((n) => {
      if (n.id === nodeId) {
        const newNode = { ...n };
        // Remove width/height from node itself to reset dimensions
        delete newNode.width;
        delete newNode.height;
        // Reset data to defaults - completely replace, don't merge
        newNode.data = {
          ...resetData,
        };
        return newNode;
      }
      return n;
    });
    
    set({ nodes: updatedNodes });
    
    if (updatedEdges.length !== state.edges.length) {
      set({ edges: updatedEdges });
    }
    
    setTimeout(() => get().saveToHistory(), 100);
  },
  
  setNavigateToFailedNode: (fn) => set({ navigateToFailedNode: fn }),
  
  setEdgesHidden: (hidden) => {
    set({ edgesHidden: hidden });
    try {
      localStorage.setItem('reactflow-edges-hidden', String(hidden));
    } catch (error) {
      console.warn('Failed to save edge visibility to localStorage:', error);
    }
  },
  };
});

function getNodeLabel(type: NodeType | string): string {
  // Check if it's a built-in node type (check if value exists in enum values)
  if (Object.values(NodeType).includes(type as NodeType)) {
    const labels: Record<NodeType, string> = {
      [NodeType.START]: 'Start',
      [NodeType.OPEN_BROWSER]: 'Open Browser',
      [NodeType.TYPE]: 'Type',
      [NodeType.SCREENSHOT]: 'Screenshot',
      [NodeType.WAIT]: 'Wait',
      [NodeType.JAVASCRIPT_CODE]: 'JavaScript Code',
      [NodeType.LOOP]: 'Loop',
      [NodeType.INT_VALUE]: 'Int Value',
      [NodeType.STRING_VALUE]: 'String Value',
      [NodeType.BOOLEAN_VALUE]: 'Boolean Value',
      [NodeType.INPUT_VALUE]: 'Input Value',
      [NodeType.VERIFY]: 'Verify',
      [NodeType.API_REQUEST]: 'API Request',
      [NodeType.API_CURL]: 'API cURL',
      [NodeType.LOAD_CONFIG_FILE]: 'Load Config File',
      [NodeType.SELECT_CONFIG_FILE]: 'Select Config File',
      [NodeType.DB_CONNECT]: 'DB Connect',
      [NodeType.DB_DISCONNECT]: 'DB Disconnect',
      [NodeType.DB_QUERY]: 'DB Query',
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

export function getDefaultNodeData(type: NodeType | string): any {
  // Check if it's a built-in node type (check if value exists in enum values)
  if (Object.values(NodeType).includes(type as NodeType)) {
    const defaults: Record<NodeType, any> = {
      [NodeType.START]: { 
        isTest: true,
        recordSession: false,
        screenshotAllNodes: false,
        screenshotTiming: 'post',
      },
      [NodeType.OPEN_BROWSER]: { 
        headless: true, 
        viewportWidth: 1280, 
        viewportHeight: 720,
        maxWindow: true,
        browser: 'chromium',
        stealthMode: false,
        capabilities: {},
        launchOptions: {},
        isTest: true
      },
      [NodeType.ACTION]: { action: 'click', selector: '', selectorType: 'css', timeout: 30000, isTest: true },
      [NodeType.ELEMENT_QUERY]: { action: 'getText', selector: '', selectorType: 'css', timeout: 30000, outputVariable: 'text', isTest: true },
      [NodeType.FORM_INPUT]: { action: 'select', selector: '', selectorType: 'css', timeout: 30000, isTest: true },
      [NodeType.NAVIGATION]: { action: 'navigate', url: '', timeout: 30000, waitUntil: 'networkidle', isTest: true },
      [NodeType.KEYBOARD]: { action: 'press', key: '', timeout: 30000, isTest: true },
      [NodeType.SCROLL]: { action: 'scrollToElement', selector: '', selectorType: 'css', timeout: 30000, isTest: true },
      [NodeType.STORAGE]: { action: 'getCookie', contextKey: 'storageResult', isTest: true },
      [NodeType.DIALOG]: { action: 'accept', timeout: 30000, isTest: true },
      [NodeType.DOWNLOAD]: { action: 'waitForDownload', timeout: 30000, isTest: true },
      [NodeType.IFRAME]: { action: 'switchToIframe', timeout: 30000, isTest: true },
      [NodeType.TYPE]: { selector: '', selectorType: 'css', text: '', timeout: 30000, isTest: true },
      [NodeType.SCREENSHOT]: { fullPage: false, isTest: true },
      [NodeType.WAIT]: { waitType: 'timeout', value: 1000, timeout: 30000, isTest: true },
      [NodeType.JAVASCRIPT_CODE]: { code: '// Your code here\nreturn context.data;', isTest: true },
      [NodeType.LOOP]: { arrayVariable: '', isTest: true },
      [NodeType.INT_VALUE]: { value: 0, isTest: true },
      [NodeType.STRING_VALUE]: { value: '', isTest: true },
      [NodeType.BOOLEAN_VALUE]: { value: false, isTest: true },
      [NodeType.INPUT_VALUE]: { dataType: PropertyDataType.STRING, value: '', isTest: true },
      [NodeType.VERIFY]: { domain: 'browser', verificationType: 'url', timeout: 30000, isTest: true },
      [NodeType.API_REQUEST]: { 
        method: 'GET', 
        url: '', 
        headers: {}, 
        bodyType: 'json', 
        timeout: 30000, 
        contextKey: 'apiResponse',
        isTest: true
      },
      [NodeType.API_CURL]: { 
        curlCommand: '', 
        timeout: 30000, 
        contextKey: 'apiResponse',
        isTest: true
      },
      [NodeType.LOAD_CONFIG_FILE]: { isTest: true },
      [NodeType.SELECT_CONFIG_FILE]: { isTest: true },
      [NodeType.DB_CONNECT]: { 
        dbType: 'postgres', 
        connectionKey: 'dbConnection',
        isTest: true 
      },
      [NodeType.DB_DISCONNECT]: { 
        connectionKey: 'dbConnection',
        isTest: true 
      },
      [NodeType.DB_QUERY]: { 
        connectionKey: 'dbConnection',
        queryType: 'sql',
        contextKey: 'dbResult',
        timeout: 30000,
        isTest: true 
      },
    };
    const defaultData = defaults[type as NodeType] || { isTest: true };
    return defaultData;
  }
  
  // Check if it's a plugin node
  const nodeDef = frontendPluginRegistry.getNodeDefinition(type);
  if (nodeDef && nodeDef.defaultData) {
    const defaultData: any = { ...nodeDef.defaultData, isTest: true };
    // Ensure switch node has defaultCase if it's missing
    if (type === 'switch.switch' && (!defaultData.defaultCase || !defaultData.defaultCase.label)) {
      defaultData.defaultCase = { label: 'Default' };
    }
    return defaultData;
  }
  
  // Fallback for switch node if plugin not loaded
  if (type === 'switch.switch') {
    return {
      cases: [
        {
          id: 'case-1',
          label: 'Case 1',
          condition: {
            type: 'ui-element',
            selector: '',
            selectorType: 'css',
            elementCheck: 'visible',
          },
        },
      ],
      defaultCase: { label: 'Default' },
      isTest: true,
    };
  }
  
  return { isTest: true };
}
