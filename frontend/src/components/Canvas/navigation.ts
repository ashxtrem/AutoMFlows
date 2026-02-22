import { useCallback, useEffect, useMemo, useRef } from 'react';
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

  // Keep refs so callbacks stay stable across nodes/fitView changes
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const navigateToFailedNode = useCallback(() => {
    if (failedNodes.size === 0) {
      return;
    }
    
    const firstFailedNodeId = Array.from(failedNodes.keys())[0];
    const failedNode = nodesRef.current.find(n => n.id === firstFailedNodeId);
    
    if (failedNode) {
      fitViewRef.current({
        nodes: [{ id: firstFailedNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, [failedNodes]);
  
  useEffect(() => {
    useWorkflowStore.getState().setNavigateToFailedNode(navigateToFailedNode);
  }, [navigateToFailedNode]);
  
  const navigateToPausedNode = useCallback(() => {
    const pausedNodeId = useWorkflowStore.getState().pausedNodeId;
    if (!pausedNodeId) {
      return;
    }
    
    const pausedNode = nodesRef.current.find(n => n.id === pausedNodeId);
    
    if (pausedNode) {
      fitViewRef.current({
        nodes: [{ id: pausedNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, []);
  
  useEffect(() => {
    useWorkflowStore.getState().setNavigateToPausedNode(navigateToPausedNode);
  }, [navigateToPausedNode]);

  const navigateToExecutingNode = useCallback(() => {
    if (!executingNodeId) {
      return;
    }
    
    const executingNode = nodesRef.current.find(n => n.id === executingNodeId);
    
    if (executingNode) {
      fitViewRef.current({
        nodes: [{ id: executingNodeId }],
        padding: 0.2,
        duration: 300,
      });
    }
  }, [executingNodeId]);

  return useMemo(() => ({
    navigateToFailedNode,
    navigateToPausedNode,
    navigateToExecutingNode,
  }), [navigateToFailedNode, navigateToPausedNode, navigateToExecutingNode]);
}
