import { useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/serialization';

export function useWorkflowAutoSave() {
  const { nodes, edges } = useWorkflowStore();

  useEffect(() => {
    // Auto-save to localStorage whenever nodes or edges change
    const timeoutId = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        saveToLocalStorage(nodes, edges);
      }
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [nodes, edges]);
}

export function useWorkflowLoad() {
  const { setNodes, setEdges } = useWorkflowStore();

  useEffect(() => {
    // Load workflow from localStorage on mount
    const loaded = loadFromLocalStorage();
    if (loaded) {
      setNodes(loaded.nodes);
      setEdges(loaded.edges);
    }
  }, [setNodes, setEdges]);
}

