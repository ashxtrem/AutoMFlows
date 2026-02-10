import { useCallback, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';

export interface UseNavigationProps {
  fitView: (options: { nodes: { id: string }[]; padding: number; duration: number }) => void;
  nodes: any[];
}

export interface UseNavigationReturn {
  navigateToFailedNode: () => void;
  navigateToPausedNode: () => void;
  navigateToExecutingNode: () => void;
}

export function useNavigation({ fitView, nodes }: UseNavigationProps): UseNavigationReturn {
  const { failedNodes, executingNodeId } = useWorkflowStore();

  // Navigate to failed node function
  const navigateToFailedNode = useCallback(() => {
    if (failedNodes.size === 0) {
      return;
    }
    
    // Get the first failed node ID
    const firstFailedNodeId = Array.from(failedNodes.keys())[0];
    const failedNode = nodes.find(n => n.id === firstFailedNodeId);
    
    if (failedNode) {
      // Use fitView to focus on the failed node
      fitView({
        nodes: [{ id: firstFailedNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, [failedNodes, nodes, fitView]);
  
  // Expose navigation function to store for TopBar access
  useEffect(() => {
    useWorkflowStore.getState().setNavigateToFailedNode(navigateToFailedNode);
  }, [navigateToFailedNode]);
  
  // Navigate to paused node function
  const navigateToPausedNode = useCallback(() => {
    const pausedNodeId = useWorkflowStore.getState().pausedNodeId;
    if (!pausedNodeId) {
      return;
    }
    
    const pausedNode = nodes.find(n => n.id === pausedNodeId);
    
    if (pausedNode) {
      // Use fitView to focus on the paused node
      fitView({
        nodes: [{ id: pausedNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, [nodes, fitView]);
  
  // Expose navigation function to store for FloatingRunButton access
  useEffect(() => {
    useWorkflowStore.getState().setNavigateToPausedNode(navigateToPausedNode);
  }, [navigateToPausedNode]);

  // Navigate to executing node function (for follow mode)
  const navigateToExecutingNode = useCallback(() => {
    if (!executingNodeId) {
      return;
    }
    
    const executingNode = nodes.find(n => n.id === executingNodeId);
    
    if (executingNode) {
      // Use fitView to focus on the executing node
      fitView({
        nodes: [{ id: executingNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, [executingNodeId, nodes, fitView]);

  return {
    navigateToFailedNode,
    navigateToPausedNode,
    navigateToExecutingNode,
  };
}
