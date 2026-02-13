import { StateCreator } from 'zustand';
import { Node, NodeChange, applyNodeChanges } from 'reactflow';
import { NodeType } from '@automflows/shared';
import { WorkflowStoreStateWithNodes } from './slices';
import { reconnectEdgesOnNodeDeletion } from './utils';
import { getNodeLabel, getDefaultNodeData } from './utils';
import { getPropertyInputHandleId } from '../../utils/nodeProperties';
import { Group } from './types';
import { WorkflowSnapshot } from './types';

export interface NodesSlice {
  setNodes: (nodes: Node[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  clearSelection: () => void;
  selectAllNodes: () => void;
  addNode: (type: NodeType | string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  updateNodeDimensions: (nodeId: string, width: number, height?: number) => void;
  copyNode: (nodeId: string | string[]) => void;
  pasteNode: (position: { x: number; y: number }) => void;
  duplicateNode: (nodeId: string | string[]) => void;
  renameNode: (nodeId: string, label: string) => void;
  deleteNode: (nodeId: string | string[]) => void;
  toggleBypass: (nodeId: string | string[]) => void;
  toggleMinimize: (nodeId: string | string[]) => void;
  togglePin: (nodeId: string | string[]) => void;
  setNodeColor: (nodeId: string | string[], borderColor?: string, backgroundColor?: string) => void;
  autoResizeNode: (nodeId: string) => void;
  reloadNode: (nodeId: string) => void;
}

export const createNodesSlice: StateCreator<
  WorkflowStoreStateWithNodes & NodesSlice,
  [],
  [],
  NodesSlice
> = (set, get) => ({
  setNodes: (nodes) => {
    const state = get();
    // Clear validation errors when nodes are set directly (e.g., when loading a workflow)
    if (state.validationErrors.size > 0) {
      set({ nodes, validationErrors: new Map(), hasUnsavedChanges: true });
    } else {
      set({ nodes, hasUnsavedChanges: true });
    }
    // If history[0] is empty and we're setting nodes (workflow load), replace history[0] with loaded state
    // This prevents undo from going back to empty state
    // Check if we're loading a workflow (history[0] is empty initial state and we're setting non-empty nodes)
    if (state.history.length > 0 && state.history[0].nodes.length === 0 && nodes.length > 0) {
      const newSnapshot: WorkflowSnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      // Replace history[0] with loaded state, reset historyIndex to 0
      const newHistory = [newSnapshot];
      set({ history: newHistory, historyIndex: 0 });
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
    const removedNodeIds = new Set<string>();
    
    // Reconnect edges for each node being removed
    for (const removalChange of removalChanges) {
      if (removalChange.type === 'remove' && removalChange.id) {
        removedNodeIds.add(removalChange.id);
        edgesToUpdate = reconnectEdgesOnNodeDeletion(removalChange.id, edgesToUpdate);
      }
    }
    
    // Clean up groups: remove deleted nodes from groups, and delete groups with no nodes
    if (removedNodeIds.size > 0) {
      const updatedGroups = state.groups
        .map((group) => {
          // Remove deleted node IDs from group
          const validNodeIds = group.nodeIds.filter((id: string) => !removedNodeIds.has(id));
          
          // If group has no valid nodes left, mark for deletion
          if (validNodeIds.length === 0) {
            return null;
          }
          
          // If some nodes were removed but group still has nodes, update the group
          if (validNodeIds.length !== group.nodeIds.length) {
            return {
              ...group,
              nodeIds: validNodeIds,
              manuallyResized: false, // Reset manual resize flag when nodes are removed
            };
          }
          
          return group;
        })
        .filter((group): group is Group => group !== null);
      
      // Only update if groups changed
      if (updatedGroups.length !== state.groups.length || 
          updatedGroups.some((g, i) => g.nodeIds.length !== state.groups[i]?.nodeIds.length)) {
        set({ groups: updatedGroups, hasUnsavedChanges: true });
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
      // Still update edges if we reconnected any, and groups if nodes were removed
      const updates: any = {};
      if (edgesToUpdate !== state.edges) {
        updates.edges = edgesToUpdate;
      }
      if (removedNodeIds.size > 0) {
        const updatedGroups = state.groups
          .map((group) => {
            const validNodeIds = group.nodeIds.filter((id: string) => !removedNodeIds.has(id));
            if (validNodeIds.length === 0) {
              return null;
            }
            if (validNodeIds.length !== group.nodeIds.length) {
              return {
                ...group,
                nodeIds: validNodeIds,
                manuallyResized: false,
              };
            }
            return group;
          })
          .filter((group): group is Group => group !== null);
        
        if (updatedGroups.length !== state.groups.length || 
            updatedGroups.some((g, i) => g.nodeIds.length !== state.groups[i]?.nodeIds.length)) {
          updates.groups = updatedGroups;
          // Clear selected group if it was deleted
          if (state.selectedGroupId && !updatedGroups.some(g => g.id === state.selectedGroupId)) {
            updates.selectedGroupId = null;
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        set(updates);
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
    
    // Update group bounds for groups containing moved nodes
    // Skip groups that were manually resized (they maintain their custom size)
    const positionChanges = filteredChanges.filter((change): change is NodeChange & { type: 'position'; id: string; position?: { x: number; y: number } } => change.type === 'position' && !!change.id);
    if (positionChanges.length > 0) {
      const movedNodeIds = new Set(positionChanges.map((c) => c.id));
      const affectedGroups = state.groups.filter((g) => g.nodeIds.some((id: string) => movedNodeIds.has(id)) && !g.manuallyResized);
      affectedGroups.forEach((group) => {
        get().updateGroupBounds(group.id);
      });
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
    
    // Clean up groups: remove node IDs that no longer exist, and delete groups with no nodes
    const finalNodeIds = new Set(nodesToSet.map(n => n.id));
    const cleanedGroups = state.groups
      .map((group) => {
        // Remove node IDs that no longer exist
        const validNodeIds = group.nodeIds.filter((id: string) => finalNodeIds.has(id));
        
        // If group has no valid nodes left, mark for deletion
        if (validNodeIds.length === 0) {
          return null;
        }
        
        // If some nodes were removed but group still has nodes, update the group
        if (validNodeIds.length !== group.nodeIds.length) {
          return {
            ...group,
            nodeIds: validNodeIds,
            manuallyResized: false, // Reset manual resize flag when nodes are removed
          };
        }
        
        return group;
      })
      .filter((group): group is Group => group !== null);
    
    // Clear selected group if it was deleted
    const finalSelectedGroupId = state.selectedGroupId && 
      !cleanedGroups.some(g => g.id === state.selectedGroupId)
      ? null 
      : state.selectedGroupId;
    
    set({
      nodes: nodesToSet,
      hasUnsavedChanges: true,
      edges: edgesToUpdate,
      selectedNode: updatedSelectedNode,
      groups: cleanedGroups,
      selectedGroupId: finalSelectedGroupId,
    });
    
    // Check if this is a significant change (add/remove) or position/data change
    const significantChange = changes.some(
      (change) => change.type === 'add' || change.type === 'remove'
    );
    const hasPositionChange = changes.some(
      (change) => change.type === 'position'
    );
    const hasDataChange = changes.some(
      (change) => change.type !== 'select' && change.type !== 'dimensions' && change.type !== 'position' && change.type !== 'add' && change.type !== 'remove'
    );
    
    // Save to history for significant changes (add/remove) immediately
    // Save position and data changes with debounce to avoid too many saves
    if (significantChange) {
      setTimeout(() => get().saveToHistory(), 100);
    } else if (hasPositionChange || hasDataChange) {
      // Debounce position/data changes to avoid saving on every drag event
      setTimeout(() => get().saveToHistory(), 300);
    }
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
          const newEdge = {
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
      hasUnsavedChanges: true,
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
      hasUnsavedChanges: true,
    });
    
      // Hide loader after a short delay to allow ReactFlow to reload
      setTimeout(() => {
        set({ canvasReloading: false });
      }, 100);
    
    // Save to history for data changes (debounced to avoid too many saves)
    setTimeout(() => get().saveToHistory(), 300);
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

  copyNode: (nodeId) => {
    const state = get();
    const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
    const nodesToCopy = state.nodes.filter((n) => nodeIds.includes(n.id));
    
    if (nodesToCopy.length === 0) return;
    
    if (nodesToCopy.length === 1) {
      // Single node: store as single Node
      set({ clipboard: JSON.parse(JSON.stringify(nodesToCopy[0])) });
    } else {
      // Multiple nodes: store as array, maintaining relative positions
      set({ clipboard: JSON.parse(JSON.stringify(nodesToCopy)) });
    }
  },

  pasteNode: (position) => {
    const clipboard = get().clipboard;
    if (!clipboard) return;
    
    const state = get();
    const timestamp = Date.now();
    
    if (Array.isArray(clipboard)) {
      // Multiple nodes: paste all maintaining relative positions
      if (clipboard.length === 0) return;
      
      // Calculate offset from first node's original position to paste position
      const firstNode = clipboard[0];
      const offsetX = position.x - firstNode.position.x;
      const offsetY = position.y - firstNode.position.y;
      
      const newNodes: Node[] = clipboard.map((node, index) => ({
        ...JSON.parse(JSON.stringify(node)),
        id: `${node.data.type}-${timestamp}-${index}`,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
      }));
      
      set({
        nodes: [...state.nodes, ...newNodes],
      });
    } else {
      // Single node: paste as before
      const newNode: Node = {
        ...JSON.parse(JSON.stringify(clipboard)),
        id: `${clipboard.data.type}-${timestamp}`,
        position,
      };
      
      set({
        nodes: [...state.nodes, newNode],
      });
    }
    
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
    
    // Clean up groups: remove deleted nodes from groups, and delete groups with no nodes
    const removedNodeIdsSet = new Set(nodeIds);
    const updatedGroups = state.groups
      .map((group) => {
        // Remove deleted node IDs from group
        const validNodeIds = group.nodeIds.filter((id: string) => !removedNodeIdsSet.has(id));
        
        // If group has no valid nodes left, mark for deletion
        if (validNodeIds.length === 0) {
          return null;
        }
        
        // If some nodes were removed but group still has nodes, update the group
        if (validNodeIds.length !== group.nodeIds.length) {
          return {
            ...group,
            nodeIds: validNodeIds,
            manuallyResized: false, // Reset manual resize flag when nodes are removed
          };
        }
        
        return group;
      })
      .filter((group): group is Group => group !== null);
    
    // Clear selected group if it was deleted
    const updatedSelectedGroupId = state.selectedGroupId && 
      !updatedGroups.some(g => g.id === state.selectedGroupId)
      ? null 
      : state.selectedGroupId;
    
    set({
      nodes: remainingNodes,
      edges: reconnectedEdges,
      selectedNode: updatedSelectedNode,
      selectedNodeIds: updatedSelectedNodeIds,
      groups: updatedGroups,
      selectedGroupId: updatedSelectedGroupId,
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
});
