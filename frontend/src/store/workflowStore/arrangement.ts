import { StateCreator } from 'zustand';
import { WorkflowStoreStateWithNodes } from './slices';
import { arrangeNodesVertical, arrangeNodesHorizontal } from '../../utils/nodeArrangement';
import { getReactFlowSetNodes } from '../../components/Canvas';

export interface ArrangementSlice {
  arrangeNodes: (mode: 'vertical' | 'horizontal', nodesPerRowColumn?: number) => void;
  arrangeSelectedNodes: (mode: 'vertical' | 'horizontal', nodesPerRowColumn: number) => void;
}

export const createArrangementSlice: StateCreator<
  WorkflowStoreStateWithNodes & ArrangementSlice,
  [],
  [],
  ArrangementSlice
> = (set, get) => ({
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

    // Create a completely new array with ALL nodes (like arrangeNodes does)
    // Create completely new node objects to ensure ReactFlow accepts the update
    // This matches how arrangeNodes works - it gets a completely new array from arrangeNodesVertical/Horizontal
    const updatedNodes = state.nodes.map(node => {
      const isSelected = selectedIds.includes(node.id);
      const newPosition = isSelected ? arrangedPositions.get(node.id) : null;
      
      // Create completely new node object with all properties copied
      const newNode = {
        ...node,
        data: { ...node.data }, // Ensure data object is new
        position: isSelected && newPosition 
          ? { x: newPosition.x, y: newPosition.y } // New position for selected nodes
          : { x: node.position.x, y: node.position.y }, // New position object for non-selected
      };
      
      return newNode;
    });

    // Replace ALL nodes (like arrangeNodes does) - this ensures ReactFlow accepts the update
    set({ nodes: updatedNodes });
    
    // Use ReactFlow's setNodes API directly to force position updates for selected nodes
    // This bypasses ReactFlow's internal caching that might prevent position updates for selected nodes
    const reactFlowSetNodesFn = getReactFlowSetNodes();
    if (reactFlowSetNodesFn) {
      // Get current nodes from ReactFlow to merge with our updates
      // This ensures ReactFlow's internal state is updated correctly
      reactFlowSetNodesFn((currentNodes: any[]) => {
        // Merge our updated positions with ReactFlow's current nodes
        const mergedNodes = currentNodes.map((rfNode: any) => {
          const updatedNode = updatedNodes.find(n => n.id === rfNode.id);
          if (updatedNode) {
            return {
              ...rfNode,
              position: updatedNode.position, // Use our updated position
            };
          }
          return rfNode;
        });
        return mergedNodes;
      });
    }
    
    setTimeout(() => get().saveToHistory(), 100);
  },
});
