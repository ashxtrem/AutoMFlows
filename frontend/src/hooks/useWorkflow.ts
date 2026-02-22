import { useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/serialization';
import { getSampleTemplate } from '../utils/sampleTemplate';

export function useWorkflowAutoSave() {
  const { nodes, edges, groups, workflowMetadata } = useWorkflowStore();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        saveToLocalStorage(nodes, edges, groups, workflowMetadata);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, groups, workflowMetadata]);
}

export function useWorkflowLoad() {
  const { setNodes, setEdges, setGroups, setWorkflowMetadata, saveToHistory, clearAllNodeErrors, setFitViewRequested, loadSubNodes } = useWorkflowStore();

  useEffect(() => {
    loadSubNodes();

    const loaded = loadFromLocalStorage();
    if (loaded) {
      setNodes(loaded.nodes);
      setEdges(loaded.edges);
      if (loaded.groups) {
        setGroups(loaded.groups);
      } else {
        setGroups([]);
      }
      if (loaded.metadata) {
        setWorkflowMetadata(loaded.metadata);
      }
      clearAllNodeErrors();
      setTimeout(() => {
        saveToHistory();
      }, 100);
    } else {
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
  }, [setNodes, setEdges, setGroups, setWorkflowMetadata, saveToHistory, clearAllNodeErrors, setFitViewRequested, loadSubNodes]);
}

