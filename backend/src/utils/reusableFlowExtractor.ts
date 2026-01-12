import { Workflow, BaseNode } from '@automflows/shared';

const REUSABLE_NODE_TYPE = 'reusable.reusable';
const END_NODE_TYPE = 'reusable.end';

/**
 * Finds a Reusable node by its context name
 * @param workflow The workflow to search
 * @param contextName The context name to match
 * @returns The Reusable node if found, null otherwise
 */
export function findReusableByContext(workflow: Workflow, contextName: string): BaseNode | null {
  for (const node of workflow.nodes) {
    if (node.type === REUSABLE_NODE_TYPE) {
      const data = node.data as any;
      if (data?.contextName === contextName) {
        return node;
      }
    }
  }
  return null;
}

/**
 * Gets the set of node IDs that belong to a reusable flow scope
 * Traverses from the Reusable node following driver connections until an End node is reached
 * @param workflow The workflow to analyze
 * @param reusableNodeId The ID of the Reusable node
 * @returns Set of node IDs in the reusable scope
 */
export function getReusableScope(workflow: Workflow, reusableNodeId: string): Set<string> {
  const scope = new Set<string>();
  const visited = new Set<string>();
  const reusableNode = workflow.nodes.find(n => n.id === reusableNodeId);
  
  if (!reusableNode || reusableNode.type !== REUSABLE_NODE_TYPE) {
    return scope;
  }

  // Track nested reusable depth to handle nested reusables correctly
  let nestedReusableDepth = 0;

  const traverse = (nodeId: string, isStart: boolean = false): void => {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);

    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      return;
    }

    // If we encounter another Reusable node, increment depth
    if (node.type === REUSABLE_NODE_TYPE && !isStart) {
      nestedReusableDepth++;
    }

    // If we encounter an End node
    if (node.type === END_NODE_TYPE) {
      // If we're at depth 0 (not inside a nested reusable), this ends the scope
      if (nestedReusableDepth === 0) {
        // Add the End node to scope but don't traverse further
        scope.add(nodeId);
        return;
      } else {
        // This is an End node for a nested reusable, decrement depth
        nestedReusableDepth--;
        scope.add(nodeId);
        // Continue traversing (this End doesn't end the outer reusable)
      }
    } else {
      // Add node to scope
      scope.add(nodeId);
    }

    // Find all outgoing edges from this node (driver connections)
    const outgoingEdges = workflow.edges.filter(
      edge => edge.source === nodeId && (!edge.sourceHandle || edge.sourceHandle === 'output' || edge.sourceHandle === 'driver')
    );

    // Follow driver connections
    for (const edge of outgoingEdges) {
      // Only follow control flow connections (driver, input, or no handle)
      // Skip property input connections (which have specific property names as targetHandle)
      if (!edge.targetHandle || edge.targetHandle === 'driver' || edge.targetHandle === 'input') {
        traverse(edge.target, false);
      }
    }
  };

  traverse(reusableNodeId, true);
  return scope;
}

/**
 * Extracts a reusable flow sub-workflow from the main workflow
 * @param workflow The main workflow
 * @param reusableNodeId The ID of the Reusable node
 * @returns A sub-workflow containing only nodes within the reusable scope, or null if not found
 */
export function extractReusableFlow(workflow: Workflow, reusableNodeId: string): Workflow | null {
  const reusableNode = workflow.nodes.find(n => n.id === reusableNodeId);
  
  if (!reusableNode || reusableNode.type !== REUSABLE_NODE_TYPE) {
    return null;
  }

  // Get the scope of nodes belonging to this reusable
  const scope = getReusableScope(workflow, reusableNodeId);
  
  if (scope.size === 0) {
    return null;
  }

  // Extract nodes in scope (excluding the Reusable node itself, but including End)
  const reusableNodes = workflow.nodes.filter(node => 
    scope.has(node.id) && node.id !== reusableNodeId
  );

  // Extract edges that connect nodes within the scope
  // Include edges where target is in scope (this covers:
  // - Internal edges where both source and target are in scope
  // - Edges from the Reusable node to nodes in scope (Reusable node is in scope but excluded from nodes list)
  // - Property input connections from outside the scope)
  const reusableEdges = workflow.edges.filter(edge => {
    const targetInScope = scope.has(edge.target);
    return targetInScope;
  });

  // Find the first node after the Reusable node (the actual start of the reusable flow)
  // This will be the node connected to the Reusable node's output
  const startEdges = workflow.edges.filter(
    edge => edge.source === reusableNodeId && (!edge.sourceHandle || edge.sourceHandle === 'output' || edge.sourceHandle === 'driver')
  );
  
  if (startEdges.length === 0) {
    // No nodes connected to reusable, return empty workflow
    return {
      nodes: [],
      edges: [],
    };
  }

  // Create a new workflow with the extracted nodes and edges
  // Note: We don't need a Start node for reusable flows - execution starts from the first node
  return {
    nodes: reusableNodes,
    edges: reusableEdges,
  };
}

/**
 * Gets all reusable scopes in a workflow
 * @param workflow The workflow to analyze
 * @returns Map of reusable node ID to set of node IDs in that scope
 */
export function getAllReusableScopes(workflow: Workflow): Map<string, Set<string>> {
  const scopes = new Map<string, Set<string>>();
  
  for (const node of workflow.nodes) {
    if (node.type === REUSABLE_NODE_TYPE) {
      const scope = getReusableScope(workflow, node.id);
      scopes.set(node.id, scope);
    }
  }
  
  return scopes;
}
