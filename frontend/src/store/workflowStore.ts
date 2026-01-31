import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { NodeType, PropertyDataType, PageDebugInfo, RecordedAction } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
import { getNodeProperties, getPropertyInputHandleId } from '../utils/nodeProperties';
import { ValidationError } from '../utils/validation';
import { arrangeNodesVertical, arrangeNodesHorizontal } from '../utils/nodeArrangement';

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
  selectedNodeIds: Set<string>; // Track multiple selected nodes
  executionStatus: 'idle' | 'running' | 'completed' | 'error';
  executingNodeId: string | null;
  failedNodes: Map<string, NodeError>; // Track failed nodes with error details
  validationErrors: Map<string, ValidationError[]>; // Track validation errors by node ID
  errorPopupNodeId: string | null; // Which failed node's error popup is currently shown
  canvasReloading: boolean; // Global loader state for canvas reload
  selectorFinderSessionId: string | null; // Selector finder session ID
  selectorFinderActive: boolean; // Whether selector finder is active
  
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
  setSelectedNodeIds: (ids: string[]) => void;
  clearSelection: () => void;
  selectAllNodes: () => void;
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
  clearHistory: () => void;
  
  // Node arrangement
  arrangeNodes: (mode: 'vertical' | 'horizontal', nodesPerRowColumn?: number) => void;
  arrangeSelectedNodes: (mode: 'vertical' | 'horizontal', nodesPerRowColumn: number) => void;
  
  // Copy/Paste/Duplicate
  copyNode: (nodeId: string | string[]) => void;
  pasteNode: (position: { x: number; y: number }) => void;
  duplicateNode: (nodeId: string | string[]) => void;
  
  // Node operations
  renameNode: (nodeId: string, label: string) => void;
  deleteNode: (nodeId: string | string[]) => void;
  toggleBypass: (nodeId: string | string[]) => void;
  toggleMinimize: (nodeId: string | string[]) => void;
  togglePin: (nodeId: string | string[]) => void;
  setNodeColor: (nodeId: string | string[], borderColor?: string, backgroundColor?: string) => void;
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
  
  // Edge update tracking - can be a single edge ID or array of edge IDs (for source handles with multiple connections)
  updatingEdgeId: string | string[] | null;
  
  // Breakpoint state
  breakpointEnabled: boolean;
  breakpointAt: 'pre' | 'post' | 'both';
  breakpointFor: 'all' | 'marked';
  pausedNodeId: string | null;
  pauseReason: 'wait-pause' | 'breakpoint' | null;
  pauseBreakpointAt: 'pre' | 'post' | 'both' | null;
  navigateToPausedNode: (() => void) | null;
  toggleBreakpoint: (nodeId: string | string[]) => void;
  setBreakpointSettings: (settings: { enabled?: boolean; breakpointAt?: 'pre' | 'post' | 'both'; breakpointFor?: 'all' | 'marked' }) => void;
  setPausedNode: (nodeId: string | null, reason: 'wait-pause' | 'breakpoint' | null, breakpointAt?: 'pre' | 'post' | 'both' | null) => void;
  setNavigateToPausedNode: (fn: (() => void) | null) => void;
  
  // Follow mode state
  followModeEnabled: boolean;
  setFollowModeEnabled: (enabled: boolean) => void;
  
  // Selector finder state
  setSelectorFinderSession: (sessionId: string | null) => void;
  setSelectorFinderActive: (active: boolean) => void;
  
  // Builder mode state
  builderModeEnabled: boolean;
  builderModeActive: boolean;
  lastCompletedNodeId: string | null;
  builderModeActions: RecordedAction[];
  builderModeInsertedActionIds: Set<string>;
  builderModeModalMinimized: boolean;
  builderModeModalPosition: { x: number; y: number } | null;
  setBuilderModeEnabled: (enabled: boolean) => void;
  setBuilderModeActive: (active: boolean) => void;
  setLastCompletedNodeId: (nodeId: string | null) => void;
  setBuilderModeActions: (actions: RecordedAction[]) => void;
  addBuilderModeAction: (action: RecordedAction) => void;
  updateBuilderModeAction: (actionId: string, updates: Partial<RecordedAction>) => void;
  removeBuilderModeAction: (actionId: string) => void;
  markActionAsInserted: (actionId: string, nodeId: string) => void;
  setBuilderModeModalMinimized: (minimized: boolean) => void;
  setBuilderModeModalPosition: (position: { x: number; y: number } | null) => void;
  resetBuilderModeActions: () => void;
}

// Helper function to reconnect edges when a node is deleted
function reconnectEdgesOnNodeDeletion(nodeId: string, edges: Edge[]): Edge[] {
  // Find incoming and outgoing edges for the deleted node
  const incomingEdges = edges.filter(e => e.target === nodeId);
  const outgoingEdges = edges.filter(e => e.source === nodeId);
  
  // Separate control flow from property input connections
  const isControlFlowEdge = (edge: Edge) => {
    if (!edge.targetHandle) return true; // No handle = control flow
    if (edge.targetHandle === 'driver' || edge.targetHandle === 'input') return true;
    if (edge.targetHandle.startsWith('case-') || edge.targetHandle === 'default') return true;
    return false; // Property input connection
  };
  
  const incomingControlFlow = incomingEdges.filter(isControlFlowEdge);
  const outgoingControlFlow = outgoingEdges.filter(isControlFlowEdge);
  
  // Create new edges: connect each incoming control flow source to each outgoing control flow target
  const newEdges: Edge[] = [];
  let edgeCounter = 0;
  
  // Remove all edges connected to deleted node first
  const remainingEdges = edges.filter(
    e => e.source !== nodeId && e.target !== nodeId
  );
  
  // Helper to check if an edge already exists
  const edgeExists = (source: string, target: string, sourceHandle: string | undefined, targetHandle: string | undefined) => {
    return remainingEdges.some(e => 
      e.source === source && 
      e.target === target && 
      e.sourceHandle === sourceHandle && 
      e.targetHandle === targetHandle
    );
  };
  
  for (const incoming of incomingControlFlow) {
    for (const outgoing of outgoingControlFlow) {
      // Prevent self-connections
      if (incoming.source !== outgoing.target) {
        // Check if edge already exists to prevent duplicates
        if (!edgeExists(incoming.source, outgoing.target, incoming.sourceHandle || undefined, outgoing.targetHandle || undefined)) {
          newEdges.push({
            id: `${incoming.source}-${outgoing.target}-${Date.now()}-${edgeCounter++}-${Math.random().toString(36).substr(2, 9)}`,
            source: incoming.source,
            target: outgoing.target,
            sourceHandle: incoming.sourceHandle,
            targetHandle: outgoing.targetHandle,
          });
        }
      }
    }
  }
  
  return [...remainingEdges, ...newEdges];
}

export const useWorkflowStore = create<WorkflowState>((set, get) => {
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
    // Breakpoint state
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
    
    // Follow mode state
    followModeEnabled: (() => {
      try {
        const saved = localStorage.getItem('automflows_follow_mode');
        return saved === 'true';
      } catch (error) {
        return false;
      }
    })(),
    
    // Builder mode state
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
    
    // Detect node removals and reconnect edges before applying changes
    const removalChanges = changes.filter((change) => change.type === 'remove' && change.id);
    let edgesToUpdate = state.edges;
    
    // Reconnect edges for each node being removed
    for (const removalChange of removalChanges) {
      if (removalChange.type === 'remove' && removalChange.id) {
        edgesToUpdate = reconnectEdgesOnNodeDeletion(removalChange.id, edgesToUpdate);
      }
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
      // Still update edges if we reconnected any
      if (edgesToUpdate !== state.edges) {
        set({ edges: edgesToUpdate });
        setTimeout(() => get().saveToHistory(), 100);
      }
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
      edges: edgesToUpdate,
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
    
    // Clear edge update tracking since connection was successfully made
    set({
      edges: addEdge(connection, finalEdges),
      updatingEdgeId: null,
    });
    setTimeout(() => get().saveToHistory(), 100);
  },

  onConnectStart: (_event, params) => {
    const state = get();
    
    // Skip if already tracking an edge update
    if (state.updatingEdgeId) {
      return;
    }
    
    // Detect edge update start: when dragging from a target handle that has an existing edge
    if (params.handleType === 'target' && params.nodeId && params.handleId) {
      // Find edge connected to this target handle
      const connectedEdge = state.edges.find(
        e => e.target === params.nodeId && e.targetHandle === params.handleId
      );
      
      if (connectedEdge) {
        // Track this edge as being updated
        set({ updatingEdgeId: connectedEdge.id });
      }
    }
    // Detect edge update start: when dragging from a source handle that has existing edges
    else if (params.handleType === 'source' && params.nodeId && params.handleId) {
      // Find all edges connected to this source handle
      const connectedEdges = state.edges.filter(
        e => e.source === params.nodeId && e.sourceHandle === params.handleId
      );
      
      if (connectedEdges.length > 0) {
        // Track all edges connected to this source handle
        const edgeIds = connectedEdges.map(e => e.id);
        set({ updatingEdgeId: edgeIds.length === 1 ? edgeIds[0] : edgeIds });
      }
    }
  },

  onConnectEnd: (_event) => {
    const state = get();
    
    // If an edge update was in progress but didn't complete (onConnect/onEdgeUpdate wasn't called)
    // This means the user dragged the edge handle but released without connecting
    // Remove the edge(s)
    if (state.updatingEdgeId) {
      const updatingEdgeIds = Array.isArray(state.updatingEdgeId) 
        ? state.updatingEdgeId 
        : [state.updatingEdgeId];
      const updatingEdgeIdValue = state.updatingEdgeId;
      
      // Use a small delay to allow onConnect/onEdgeUpdate to complete if they were called
      // This handles race conditions where onConnectEnd fires before onConnect/onEdgeUpdate
      setTimeout(() => {
        const currentState = get();
        // Check if we're still tracking the same edge(s)
        if (currentState.updatingEdgeId === updatingEdgeIdValue) {
          // Find edges that still exist
          const edgesToRemove = currentState.edges.filter(e => 
            updatingEdgeIds.includes(e.id)
          );
          
          if (edgesToRemove.length > 0) {
            // Edge update was cancelled - remove the edge(s)
            set({
              edges: currentState.edges.filter(e => !updatingEdgeIds.includes(e.id)),
              updatingEdgeId: null,
            });
            setTimeout(() => get().saveToHistory(), 100);
          } else {
            // Edge(s) were already removed or updated, just clear tracking
            set({ updatingEdgeId: null });
          }
        }
      }, 50); // Small delay to allow onConnect/onEdgeUpdate to complete
    }
  },

  onEdgeUpdate: (oldEdge, newConnection) => {
    const state = get();
    
    // Helper to check if oldEdge.id is being tracked
    const isTrackingEdge = () => {
      if (!state.updatingEdgeId) return false;
      if (typeof state.updatingEdgeId === 'string') {
        return state.updatingEdgeId === oldEdge.id;
      }
      return Array.isArray(state.updatingEdgeId) && state.updatingEdgeId.includes(oldEdge.id);
    };
    
    // Validate new connection
    if (!newConnection.source || !newConnection.target) {
      // Clear tracking if update failed
      if (isTrackingEdge()) {
        set({ updatingEdgeId: null });
      }
      return;
    }
    
    // Prevent self-connections
    if (newConnection.source === newConnection.target) {
      // Clear tracking if self-connection attempted
      if (isTrackingEdge()) {
        set({ updatingEdgeId: null });
      }
      return;
    }
    
    // Check if reconnecting to the same node and handle (no-op, keep connection)
    if (oldEdge.target === newConnection.target && 
        oldEdge.targetHandle === newConnection.targetHandle) {
      // Connection unchanged, keep it and clear tracking
      if (isTrackingEdge()) {
        set({ updatingEdgeId: null });
      }
      return;
    }
    
    // Update connection to new target
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
    
    // Clear tracking since update succeeded
    set({ 
      edges: finalEdges,
      updatingEdgeId: null,
    });
    setTimeout(() => get().saveToHistory(), 100);
  },

  setSelectedNode: (node) => {
    if (!node) {
      set({ selectedNode: null, selectedNodeIds: new Set<string>() });
      return;
    }
    // Find the node from the nodes array to ensure we have the latest version
    const latestNode = get().nodes.find((n) => n.id === node.id) || node;
    set({ selectedNode: latestNode, selectedNodeIds: new Set([latestNode.id]) });
  },

  setSelectedNodeIds: (ids) => {
    const nodeIdsSet = new Set(ids);
    const currentState = get();
    // Don't automatically set selectedNode - it should only be set via context menu "Properties" option
    // This prevents RightSidebar from opening on regular node clicks
    // IMPORTANT: Never clear selectedNode here - it should only be cleared via setSelectedNode(null)
    // This preserves the Properties panel when ReactFlow's selection changes (e.g., when context menu closes)
    set({ 
      selectedNodeIds: nodeIdsSet, 
      selectedNode: currentState.selectedNode // Always preserve selectedNode - only setSelectedNode(null) clears it
    });
  },

  clearSelection: () => {
    set({ selectedNodeIds: new Set<string>(), selectedNode: null });
  },

  selectAllNodes: () => {
    const state = get();
    const allNodeIds = new Set(state.nodes.map((n) => n.id));
    // Don't set selectedNode - only set it via context menu
    set({ selectedNodeIds: allNodeIds, selectedNode: null });
  },

  addNode: (type, position) => {
    const state = get();
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
    
    let newEdges = state.edges;
    
    // Auto-connect: find last node with no output connections
    // Check localStorage directly to avoid circular dependency
    try {
      const autoConnect = localStorage.getItem('automflows_settings_canvas_autoConnect') === 'true';
      if (autoConnect && state.nodes.length > 0) {
        // Find nodes with no output connections (no edges where they are the source)
        const nodesWithOutputs = new Set(state.edges.map((e) => e.source));
        const lastNodeWithoutOutput = state.nodes
          .filter((node) => !nodesWithOutputs.has(node.id))
          .slice(-1)[0];
        
        if (lastNodeWithoutOutput) {
          // Create edge from last node to new node
          const newEdge: Edge = {
            id: `edge-${lastNodeWithoutOutput.id}-output-${id}-input`,
            source: lastNodeWithoutOutput.id,
            target: id,
            sourceHandle: 'output',
            targetHandle: 'input',
          };
          newEdges = [...state.edges, newEdge];
        }
      }
    } catch (error) {
      // localStorage not available, skip auto-connect
    }
    
    set({
      nodes: [...state.nodes, newNode],
      edges: newEdges,
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

  clearHistory: () => {
    const state = get();
    const currentSnapshot: WorkflowSnapshot = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
    };
    set({
      history: [currentSnapshot],
      historyIndex: 0,
    });
  },

  arrangeNodes: (mode, nodesPerRowColumn = 10) => {
    const state = get();
    const arrangedNodes = mode === 'vertical'
      ? arrangeNodesVertical(state.nodes, state.edges, { nodesPerColumn: nodesPerRowColumn })
      : arrangeNodesHorizontal(state.nodes, state.edges, { nodesPerRow: nodesPerRowColumn });
    set({ nodes: arrangedNodes });
    setTimeout(() => get().saveToHistory(), 100);
  },

  arrangeSelectedNodes: (mode, nodesPerRowColumn) => {
    const state = get();
    const selectedIds = Array.from(state.selectedNodeIds);
    
    if (selectedIds.length < 2) {
      return; // Need at least 2 nodes to arrange
    }

    // Filter to only selected nodes
    const selectedNodes = state.nodes.filter(node => selectedIds.includes(node.id));
    
    // Filter edges to only those between selected nodes
    const selectedEdges = state.edges.filter(edge => 
      selectedIds.includes(edge.source) && selectedIds.includes(edge.target)
    );

    // Arrange selected nodes
    const arrangedSelectedNodes = mode === 'vertical'
      ? arrangeNodesVertical(selectedNodes, selectedEdges, { nodesPerColumn: nodesPerRowColumn })
      : arrangeNodesHorizontal(selectedNodes, selectedEdges, { nodesPerRow: nodesPerRowColumn });

    // Create a map of arranged node positions
    const arrangedPositions = new Map<string, { x: number; y: number }>();
    arrangedSelectedNodes.forEach(node => {
      arrangedPositions.set(node.id, node.position);
    });

    // Update only selected nodes' positions, preserve others
    const updatedNodes = state.nodes.map(node => {
      if (selectedIds.includes(node.id)) {
        const newPosition = arrangedPositions.get(node.id);
        if (newPosition) {
          return {
            ...node,
            position: newPosition,
          };
        }
      }
      return node;
    });

    set({ nodes: updatedNodes });
    setTimeout(() => get().saveToHistory(), 100);
  },

  // Copy/Paste/Duplicate
  copyNode: (nodeId) => {
    const state = get();
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    // For multi-copy, store all nodes in clipboard (we'll handle paste separately)
    if (nodeIds.length === 1) {
      const node = state.nodes.find((n) => n.id === nodeIds[0]);
      if (node) {
        set({ clipboard: JSON.parse(JSON.stringify(node)) });
      }
    } else if (nodeIds.length > 1) {
      // Store first node for now (multi-copy/paste can be enhanced later)
      const node = state.nodes.find((n) => n.id === nodeIds[0]);
      if (node) {
        set({ clipboard: JSON.parse(JSON.stringify(node)) });
      }
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
    const state = get();
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    const nodesToDuplicate = state.nodes.filter((n) => nodeIds.includes(n.id));
    
    if (nodesToDuplicate.length === 0) return;
    
    const newNodes: Node[] = nodesToDuplicate.map((node, index) => ({
      ...JSON.parse(JSON.stringify(node)),
      id: `${node.data.type}-${Date.now()}-${index}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
    }));
    
    set({
      nodes: [...state.nodes, ...newNodes],
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
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    
    // Reconnect edges for each node being deleted
    let reconnectedEdges = state.edges;
    for (const id of nodeIds) {
      reconnectedEdges = reconnectEdgesOnNodeDeletion(id, reconnectedEdges);
    }
    
    // Remove all selected nodes
    const remainingNodes = state.nodes.filter((n) => !nodeIds.includes(n.id));
    const updatedSelectedNode = state.selectedNode && !nodeIds.includes(state.selectedNode.id) 
      ? state.selectedNode 
      : null;
    const updatedSelectedNodeIds = new Set(
      Array.from(state.selectedNodeIds).filter((id) => !nodeIds.includes(id))
    );
    
    set({
      nodes: remainingNodes,
      edges: reconnectedEdges,
      selectedNode: updatedSelectedNode,
      selectedNodeIds: updatedSelectedNodeIds,
    });
    setTimeout(() => get().saveToHistory(), 100);
  },

  toggleBypass: (nodeId) => {
    const state = get();
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    const nodes = state.nodes.filter((n) => nodeIds.includes(n.id));
    
    // Determine toggle state: if all are bypassed, unbypass all; otherwise bypass all
    const allBypassed = nodes.length > 0 && nodes.every((n) => n.data.bypass === true);
    const newBypassState = !allBypassed;
    
    nodes.forEach((node) => {
      get().updateNodeData(node.id, { bypass: newBypassState });
    });
    
    setTimeout(() => get().saveToHistory(), 100);
  },

  toggleMinimize: (nodeId) => {
    const state = get();
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    const nodes = state.nodes.filter((n) => nodeIds.includes(n.id));
    
    // Determine toggle state: if all are minimized, unminimize all; otherwise minimize all
    const allMinimized = nodes.length > 0 && nodes.every((n) => n.data.isMinimized === true);
    const newMinimizedState = !allMinimized;
    
    nodes.forEach((node) => {
      get().updateNodeData(node.id, { isMinimized: newMinimizedState });
    });
    
    setTimeout(() => get().saveToHistory(), 100);
  },

  togglePin: (nodeId) => {
    const state = get();
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    const nodes = state.nodes.filter((n) => nodeIds.includes(n.id));
    
    // Determine toggle state: if all are pinned, unpin all; otherwise pin all
    const allPinned = nodes.length > 0 && nodes.every((n) => n.data.isPinned === true);
    const newPinnedState = !allPinned;
    
    nodes.forEach((node) => {
      get().updateNodeData(node.id, { isPinned: newPinnedState });
    });
    
    setTimeout(() => get().saveToHistory(), 100);
  },

  setNodeColor: (nodeId, _borderColor, backgroundColor) => {
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    const updates: any = {};
    // Only set backgroundColor (borderColor is no longer customizable)
    if (backgroundColor !== undefined) updates.backgroundColor = backgroundColor;
    
    nodeIds.forEach((id) => {
      get().updateNodeData(id, updates);
    });
    
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
  
  // Breakpoint methods
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
  
  // Builder mode methods
  setBuilderModeEnabled: (enabled) => {
    set({ builderModeEnabled: enabled });
    try {
      localStorage.setItem('automflows_builder_mode_enabled', String(enabled));
    } catch (error) {
      console.warn('Failed to save builder mode enabled to localStorage:', error);
    }
  },
  
  setBuilderModeActive: (active) => {
    set({ builderModeActive: active });
  },
  
  setLastCompletedNodeId: (nodeId) => {
    set({ lastCompletedNodeId: nodeId });
  },
  
  setBuilderModeActions: (actions) => {
    set({ builderModeActions: actions });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(actions));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  addBuilderModeAction: (action) => {
    const state = get();
    const newActions = [...state.builderModeActions, action];
    set({ builderModeActions: newActions });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(newActions));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  updateBuilderModeAction: (actionId, updates) => {
    const state = get();
    const newActions = state.builderModeActions.map(action => 
      action.id === actionId ? { ...action, ...updates } : action
    );
    set({ builderModeActions: newActions });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(newActions));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  removeBuilderModeAction: (actionId) => {
    const state = get();
    const newActions = state.builderModeActions.filter(action => action.id !== actionId);
    const newInsertedIds = new Set(state.builderModeInsertedActionIds);
    newInsertedIds.delete(actionId);
    set({ 
      builderModeActions: newActions,
      builderModeInsertedActionIds: newInsertedIds
    });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(newActions));
      localStorage.setItem('automflows_builder_mode_inserted_ids', JSON.stringify(Array.from(newInsertedIds)));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  markActionAsInserted: (actionId, nodeId) => {
    const state = get();
    const newActions = state.builderModeActions.map(action => 
      action.id === actionId ? { ...action, inserted: true, nodeId } : action
    );
    const newInsertedIds = new Set(state.builderModeInsertedActionIds);
    newInsertedIds.add(actionId);
    set({ 
      builderModeActions: newActions,
      builderModeInsertedActionIds: newInsertedIds
    });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify(newActions));
      localStorage.setItem('automflows_builder_mode_inserted_ids', JSON.stringify(Array.from(newInsertedIds)));
    } catch (error) {
      console.warn('Failed to save builder mode actions to localStorage:', error);
    }
  },
  
  setBuilderModeModalMinimized: (minimized) => {
    set({ builderModeModalMinimized: minimized });
    try {
      localStorage.setItem('automflows_builder_mode_modal_minimized', String(minimized));
    } catch (error) {
      console.warn('Failed to save builder mode modal minimized to localStorage:', error);
    }
  },
  
  setBuilderModeModalPosition: (position) => {
    set({ builderModeModalPosition: position });
    try {
      if (position) {
        localStorage.setItem('automflows_builder_mode_modal_position', JSON.stringify(position));
      } else {
        localStorage.removeItem('automflows_builder_mode_modal_position');
      }
    } catch (error) {
      console.warn('Failed to save builder mode modal position to localStorage:', error);
    }
  },
  
  resetBuilderModeActions: () => {
    set({ 
      builderModeActions: [],
      builderModeInsertedActionIds: new Set<string>(),
      builderModeActive: false,
      lastCompletedNodeId: null
    });
    try {
      localStorage.setItem('automflows_builder_mode_actions', JSON.stringify([]));
      localStorage.setItem('automflows_builder_mode_inserted_ids', JSON.stringify([]));
    } catch (error) {
      console.warn('Failed to reset builder mode actions in localStorage:', error);
    }
  },
};
});

export function getNodeLabel(type: NodeType | string): string {
  // Check if it's a built-in node type (check if value exists in enum values)
  if (Object.values(NodeType).includes(type as NodeType)) {
    const labels: Record<NodeType, string> = {
      [NodeType.START]: 'Start',
      [NodeType.OPEN_BROWSER]: 'Open Browser',
      [NodeType.NAVIGATION]: 'Navigation',
      [NodeType.KEYBOARD]: 'Keyboard',
      [NodeType.SCROLL]: 'Scroll',
      [NodeType.STORAGE]: 'Storage',
      [NodeType.DIALOG]: 'Dialog',
      [NodeType.DOWNLOAD]: 'Download',
      [NodeType.IFRAME]: 'Iframe',
      [NodeType.ACTION]: 'Action',
      [NodeType.ELEMENT_QUERY]: 'Element Query',
      [NodeType.FORM_INPUT]: 'Form Input',
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
      [NodeType.CONTEXT_MANIPULATE]: 'Context Manipulate',
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
      [NodeType.TYPE]: { selector: '', selectorType: 'css', inputMethod: 'fill', text: '', delay: 0, timeout: 30000, isTest: true },
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
      [NodeType.CONTEXT_MANIPULATE]: { 
        action: 'setGeolocation',
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
