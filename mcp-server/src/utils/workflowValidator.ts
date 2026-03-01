import { Workflow, BaseNode, Edge, NodeType } from '@automflows/shared';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class WorkflowValidator {
  static validate(workflow: Workflow): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have a nodes array');
      return { valid: false, errors, warnings };
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      errors.push('Workflow must have an edges array');
      return { valid: false, errors, warnings };
    }

    // Check for Start node
    const startNodes = workflow.nodes.filter(n => n.type === NodeType.START);
    if (startNodes.length === 0) {
      errors.push('Workflow must contain a Start node');
    } else if (startNodes.length > 1) {
      errors.push('Workflow must contain exactly one Start node');
    }

    // Validate nodes
    const nodeIds = new Set<string>();
    for (const node of workflow.nodes) {
      if (!node.id) {
        errors.push('All nodes must have an id');
      } else if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node id: ${node.id}`);
      } else {
        nodeIds.add(node.id);
      }

      if (!node.type) {
        errors.push(`Node ${node.id} must have a type`);
      }

      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        errors.push(`Node ${node.id} must have valid position coordinates`);
      }

      if (!node.data) {
        warnings.push(`Node ${node.id} has no data property`);
      }
    }

    // Validate edges
    const edgeIds = new Set<string>();
    for (const edge of workflow.edges) {
      if (!edge.id) {
        errors.push('All edges must have an id');
      } else if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge id: ${edge.id}`);
      } else {
        edgeIds.add(edge.id);
      }

      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }

      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
    }

    // Check for isolated nodes (nodes with no connections)
    const connectedNodes = new Set<string>();
    for (const edge of workflow.edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    for (const node of workflow.nodes) {
      if (node.type !== NodeType.START && !connectedNodes.has(node.id)) {
        warnings.push(`Node ${node.id} (${node.type}) is not connected to any other node`);
      }
    }

    // Check for cycles -- the backend's topological sort rejects cycles as hard errors
    const cycleNode = this.detectControlFlowCycleNode(workflow);
    if (cycleNode) {
      errors.push(`Circular dependency detected involving node: ${cycleNode}. ` +
        'If you have a loop node, do NOT create a back-edge from the last body node to the loop. ' +
        'Use sourceHandle="loopComplete" to connect post-loop nodes.');
    }

    // Loop-specific edge validation
    const loopErrors = this.validateLoopEdges(workflow);
    errors.push(...loopErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detects cycles in control flow edges. Returns the node ID involved in the
   * cycle, or null if no cycle exists. Matches backend parser's topological
   * sort behavior -- any cycle is a hard error.
   */
  private static detectControlFlowCycleNode(workflow: Workflow): string | null {
    const controlFlowEdges = workflow.edges.filter(
      e => e.targetHandle === 'input' || e.sourceHandle === 'output' ||
           (!e.targetHandle && !e.sourceHandle)
    );

    const graph = new Map<string, string[]>();
    const allNodes = new Set<string>(workflow.nodes.map(n => n.id));

    for (const edge of controlFlowEdges) {
      if (!graph.has(edge.source)) {
        graph.set(edge.source, []);
      }
      graph.get(edge.source)!.push(edge.target);
    }

    // Kahn's algorithm for topological sort -- detects cycles reliably
    const inDegree = new Map<string, number>();
    for (const nodeId of allNodes) {
      inDegree.set(nodeId, 0);
    }
    for (const edge of controlFlowEdges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, deg] of inDegree) {
      if (deg === 0) queue.push(nodeId);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);
      for (const neighbor of (graph.get(node) || [])) {
        const newDeg = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (sorted.length < allNodes.size) {
      // Find the first node still with in-degree > 0
      for (const [nodeId, deg] of inDegree) {
        if (deg > 0) return nodeId;
      }
    }

    return null;
  }

  /**
   * Validates loop-specific edge patterns:
   * - No back-edges from loop body to the loop node
   * - Post-loop nodes should use loopComplete handle
   */
  private static validateLoopEdges(workflow: Workflow): string[] {
    const errors: string[] = [];
    const loopNodes = workflow.nodes.filter(n => n.type === NodeType.LOOP);

    for (const loopNode of loopNodes) {
      // Find all nodes reachable from this loop's output handle (the body)
      const bodyNodes = this.getReachableFromHandle(workflow, loopNode.id, 'output');

      // Check for back-edges: no body node should have an edge back to the loop
      for (const edge of workflow.edges) {
        if (bodyNodes.has(edge.source) && edge.target === loopNode.id) {
          errors.push(
            `Loop "${loopNode.id}" has a back-edge from body node "${edge.source}" (edge ${edge.id}). ` +
            'Remove this edge -- the executor handles iteration internally.'
          );
        }
      }
    }

    return errors;
  }

  private static getReachableFromHandle(workflow: Workflow, nodeId: string, handle: string): Set<string> {
    const reachable = new Set<string>();
    const visited = new Set<string>();

    const initialEdges = workflow.edges.filter(
      e => e.source === nodeId && e.sourceHandle === handle
    );

    const queue = initialEdges.map(e => e.target);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      reachable.add(current);

      const outgoing = workflow.edges.filter(
        e => e.source === current && (!e.sourceHandle || e.sourceHandle === 'output')
      );
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return reachable;
  }
}
