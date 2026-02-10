import { StateCreator } from 'zustand';
import { Edge, EdgeChange, Connection, addEdge, applyEdgeChanges } from 'reactflow';
import { NodeType, PropertyDataType } from '@automflows/shared';
import { WorkflowStoreStateWithNodes } from './slices';
import { canConvertType } from './utils';
import { getNodeProperties } from '../../utils/nodeProperties';
import { WorkflowSnapshot } from './types';

export interface EdgesSlice {
  setEdges: (edges: Edge[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onConnectStart: (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null }) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent) => void;
  onEdgeUpdate: (oldEdge: Edge, newConnection: Connection) => void;
  removeNodeConnections: (nodeId: string) => void;
  setEdgesHidden: (hidden: boolean) => void;
}

export const createEdgesSlice: StateCreator<
  WorkflowStoreStateWithNodes & EdgesSlice,
  [],
  [],
  EdgesSlice
> = (set, get) => ({
  setEdges: (edges) => {
    const state = get();
    // Clear validation errors when edges are set directly (e.g., when loading a workflow)
    if (state.validationErrors.size > 0) {
      set({ edges, validationErrors: new Map(), hasUnsavedChanges: true });
    } else {
      set({ edges, hasUnsavedChanges: true });
    }
    // If history[0] is empty and we're setting edges (workflow load), replace history[0] with loaded state
    // This prevents undo from going back to empty state
    // Check if we're loading a workflow (history[0] is empty initial state and we're setting non-empty edges)
    if (state.history.length > 0 && state.history[0].edges.length === 0 && edges.length > 0 && state.nodes.length > 0) {
      const newSnapshot: WorkflowSnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };
      // Replace history[0] with loaded state, reset historyIndex to 0
      const newHistory = [newSnapshot];
      set({ history: newHistory, historyIndex: 0 });
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
      hasUnsavedChanges: true,
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
      hasUnsavedChanges: true,
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
      hasUnsavedChanges: true,
    });
    setTimeout(() => get().saveToHistory(), 100);
  },

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

  setEdgesHidden: (hidden) => {
    set({ edgesHidden: hidden });
    try {
      localStorage.setItem('reactflow-edges-hidden', String(hidden));
    } catch (error) {
      console.warn('Failed to save edge visibility to localStorage:', error);
    }
  },
});
