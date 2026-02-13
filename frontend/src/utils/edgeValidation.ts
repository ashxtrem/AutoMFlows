import { Node, Edge } from 'reactflow';

/**
 * Check if an edge is valid (both source and target nodes exist)
 * We're lenient about handles - React Flow will handle handle validation
 * This just ensures nodes exist to prevent errors
 */
export function isValidEdge(edge: Edge, nodes: Node[]): boolean {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  
  // Only filter edges where nodes don't exist
  // Let React Flow handle handle validation (we'll suppress the warnings)
  return !!sourceNode && !!targetNode;
}

/**
 * Filter out invalid edges from an array
 */
export function filterValidEdges(edges: Edge[], nodes: Node[]): Edge[] {
  return edges.filter(edge => isValidEdge(edge, nodes));
}

/**
 * Suppress React Flow console warnings for edge validation errors
 * Call this once during app initialization
 */
export function suppressReactFlowWarnings(): void {
  if (typeof window === 'undefined') return;
  
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    // Suppress React Flow edge validation warnings
    const message = args[0]?.toString() || '';
    if (message.includes('[React Flow]: Couldn\'t create edge') || 
        message.includes('Help: https://reactflow.dev/error#008')) {
      return; // Suppress this warning
    }
    // Allow all other warnings
    originalWarn.apply(console, args);
  };
}
