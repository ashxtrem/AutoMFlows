import { Node, Edge } from 'reactflow';

/**
 * Generate a stable hash for a workflow based on its structure (nodes and edges)
 * This hash is used to track workflow-specific preferences in localStorage.
 * The hash excludes node positions and IDs to remain stable for the same workflow structure.
 */
export function generateWorkflowHash(nodes: Node[], edges: Edge[]): string {
  // Create a simplified representation of the workflow structure
  // Sort nodes by type and data structure (excluding position and id)
  const normalizedNodes = nodes
    .map(node => ({
      type: node.data.type,
      // Include relevant data fields but exclude position, id, and UI-specific fields
      data: {
        ...node.data,
        // Remove UI-specific fields
        isExecuting: undefined,
        // Keep structure-relevant fields like headless, breakpoint, etc.
      },
    }))
    .sort((a, b) => {
      // Sort by type first, then by a stable representation of data
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return JSON.stringify(a.data).localeCompare(JSON.stringify(b.data));
    });

  // Sort edges by source and target (excluding id)
  const normalizedEdges = edges
    .map(edge => ({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
    }))
    .sort((a, b) => {
      if (a.source !== b.source) {
        return a.source.localeCompare(b.source);
      }
      if (a.target !== b.target) {
        return a.target.localeCompare(b.target);
      }
      return (a.sourceHandle || '').localeCompare(b.sourceHandle || '');
    });

  // Create a stable string representation
  const workflowStructure = JSON.stringify({
    nodes: normalizedNodes,
    edges: normalizedEdges,
  });

  // Simple hash function (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < workflowStructure.length; i++) {
    hash = ((hash << 5) + hash) + workflowStructure.charCodeAt(i);
  }

  // Convert to positive hex string
  return Math.abs(hash).toString(16);
}
