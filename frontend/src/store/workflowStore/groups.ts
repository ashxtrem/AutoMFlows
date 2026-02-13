import { StateCreator } from 'zustand';
import { WorkflowStateCore } from './core';
import { Group } from './types';
import { calculateGroupBounds } from '../../utils/groupUtils';

export interface GroupsSlice {
  setGroups: (groups: Group[]) => void;
  createGroup: (nodeIds: string[]) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  deleteGroup: (groupId: string) => void;
  addNodesToGroup: (groupId: string, nodeIds: string[]) => void;
  removeNodesFromGroup: (groupId: string, nodeIds: string[]) => void;
  getGroupForNode: (nodeId: string) => Group | null;
  getGroupsForNode: (nodeId: string) => Group[];
  calculateGroupBounds: (nodeIds: string[]) => { x: number; y: number; width: number; height: number } | null;
  updateGroupBounds: (groupId: string) => void;
  setGroupColor: (groupId: string, color: string) => void;
  setSelectedGroupId: (groupId: string | null) => void;
  moveGroupNodes: (groupId: string, offsetX: number, offsetY: number) => void;
}

export const createGroupsSlice: StateCreator<
  WorkflowStateCore & GroupsSlice,
  [],
  [],
  GroupsSlice
> = (set, get) => ({
  setGroups: (groups) => {
    set({ groups, hasUnsavedChanges: true });
  },

  createGroup: (nodeIds) => {
    const state = get();
    if (nodeIds.length === 0) {
      return;
    }

    // Calculate bounds for the group
    const nodesToGroup = state.nodes.filter((n) => nodeIds.includes(n.id));
    const bounds = calculateGroupBounds(nodesToGroup);
    if (!bounds) {
      return;
    }

    // Generate unique group ID
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate default name
    const existingGroupNames = state.groups.map((g) => g.name);
    let groupNumber = 1;
    let groupName = `Group ${groupNumber}`;
    while (existingGroupNames.includes(groupName)) {
      groupNumber++;
      groupName = `Group ${groupNumber}`;
    }

    const newGroup: Group = {
      id: groupId,
      name: groupName,
      nodeIds: [...nodeIds],
      position: { x: bounds.x, y: bounds.y },
      width: bounds.width,
      height: bounds.height,
    };

    set({ groups: [...state.groups, newGroup], hasUnsavedChanges: true });
  },

  updateGroup: (groupId, updates) => {
    const state = get();
    // If updating width/height, mark as manually resized
    const isManualResize = updates.width !== undefined || updates.height !== undefined;
    const updatedGroups = state.groups.map((g) =>
      g.id === groupId ? { ...g, ...updates, manuallyResized: isManualResize ? true : g.manuallyResized } : g
    );
    set({ groups: updatedGroups, hasUnsavedChanges: true });
  },

  deleteGroup: (groupId) => {
    const state = get();
    const updatedGroups = state.groups.filter((g) => g.id !== groupId);
    set({ groups: updatedGroups, selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId, hasUnsavedChanges: true });
  },

  addNodesToGroup: (groupId, nodeIds) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    // Add nodes that aren't already in the group
    const newNodeIds = [...new Set([...group.nodeIds, ...nodeIds])];
    const nodesToGroup = state.nodes.filter((n) => newNodeIds.includes(n.id));
    const bounds = calculateGroupBounds(nodesToGroup);
    if (!bounds) return;

    const updatedGroups = state.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            nodeIds: newNodeIds,
            position: { x: bounds.x, y: bounds.y },
            width: bounds.width,
            height: bounds.height,
            manuallyResized: false, // Clear flag when nodes are added
          }
        : g
    );
    set({ groups: updatedGroups, hasUnsavedChanges: true });
  },

  removeNodesFromGroup: (groupId, nodeIds) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    const updatedNodeIds = group.nodeIds.filter((id: string) => !nodeIds.includes(id));
    if (updatedNodeIds.length === 0) {
      // Remove group if no nodes left
      get().deleteGroup(groupId);
      return;
    }

    const nodesToGroup = state.nodes.filter((n) => updatedNodeIds.includes(n.id));
    const bounds = calculateGroupBounds(nodesToGroup);
    if (!bounds) return;

    const updatedGroups = state.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            nodeIds: updatedNodeIds,
            position: { x: bounds.x, y: bounds.y },
            width: bounds.width,
            height: bounds.height,
            manuallyResized: false, // Clear flag when nodes are removed
          }
        : g
    );
    set({ groups: updatedGroups, hasUnsavedChanges: true });
  },

  getGroupForNode: (nodeId) => {
    const state = get();
    return state.groups.find((g) => g.nodeIds.includes(nodeId)) || null;
  },

  getGroupsForNode: (nodeId) => {
    const state = get();
    return state.groups.filter((g) => g.nodeIds.includes(nodeId));
  },

  calculateGroupBounds: (nodeIds) => {
    const state = get();
    const nodesToGroup = state.nodes.filter((n) => nodeIds.includes(n.id));
    return calculateGroupBounds(nodesToGroup);
  },

  updateGroupBounds: (groupId) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    const nodesToGroup = state.nodes.filter((n) => group.nodeIds.includes(n.id));
    const bounds = calculateGroupBounds(nodesToGroup);
    if (!bounds) return;

    get().updateGroup(groupId, {
      position: { x: bounds.x, y: bounds.y },
      width: bounds.width,
      height: bounds.height,
    });
  },

  setGroupColor: (groupId, color) => {
    const state = get();
    state.updateGroup(groupId, { borderColor: color });
  },

  setSelectedGroupId: (groupId) => {
    set({ selectedGroupId: groupId });
  },

  moveGroupNodes: (groupId, offsetX, offsetY) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    // Update all node positions in the group
    const updatedNodes = state.nodes.map((node) => {
      if (group.nodeIds.includes(node.id)) {
        return {
          ...node,
          position: {
            x: node.position.x + offsetX,
            y: node.position.y + offsetY,
          },
        };
      }
      return node;
    });

    // Update group position
    // When dragging group, update bounds but preserve manuallyResized flag
    const updatedGroups = state.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            position: {
              x: g.position.x + offsetX,
              y: g.position.y + offsetY,
            },
          }
        : g
    );

    set({
      nodes: updatedNodes,
      groups: updatedGroups,
      hasUnsavedChanges: true,
    });
    
    // Update bounds after moving (but skip if manually resized - bounds will be updated by onNodesChange)
    if (!group.manuallyResized) {
      setTimeout(() => {
        const { updateGroupBounds } = get();
        updateGroupBounds(groupId);
      }, 0);
    }
  },
});
