import { useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/serialization';
import { getSampleTemplate } from '../utils/sampleTemplate';

export function useWorkflowAutoSave() {
  const { nodes, edges, groups } = useWorkflowStore();

  useEffect(() => {
    // Auto-save to localStorage whenever nodes, edges, or groups change
    const timeoutId = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        saveToLocalStorage(nodes, edges, groups);
      }
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, groups]);
}

export function useWorkflowLoad() {
  const { setNodes, setEdges, setGroups, saveToHistory, clearAllNodeErrors, setFitViewRequested } = useWorkflowStore();

  useEffect(() => {
    // Load workflow from localStorage on mount
    const loaded = loadFromLocalStorage();
    if (loaded) {
      setNodes(loaded.nodes);
      setEdges(loaded.edges);
      if (loaded.groups) {
        setGroups(loaded.groups);
      } else {
        setGroups([]); // Clear groups if not present
      }
      // Clear error states on page refresh (execution state is lost)
      clearAllNodeErrors();
      // Save initial loaded state to history
      setTimeout(() => {
        saveToHistory();
      }, 100);
    } else {
      // No saved workflow: load reset template instead of blank canvas
      const { nodes: templateNodes, edges: templateEdges } = getSampleTemplate();
      setNodes(templateNodes);
      setEdges(templateEdges);
      setGroups([]);
      clearAllNodeErrors();
      setFitViewRequested(true);
      setTimeout(() => {
        saveToHistory();
      }, 100);
    }
  }, [setNodes, setEdges, setGroups, saveToHistory, clearAllNodeErrors, setFitViewRequested]);
}

