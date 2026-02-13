import { StateCreator } from 'zustand';
import { WorkflowStoreStateWithNodes } from './slices';

export interface PropertyInputSlice {
  convertPropertyToInput: (nodeId: string, propertyName: string) => void;
  convertInputToProperty: (nodeId: string, propertyName: string) => void;
}

export const createPropertyInputSlice: StateCreator<
  WorkflowStoreStateWithNodes & PropertyInputSlice,
  [],
  [],
  PropertyInputSlice
> = (set, get) => ({
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
});
