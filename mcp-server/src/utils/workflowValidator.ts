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

    // Check for cycles (basic check - nodes shouldn't form cycles through control flow)
    // This is a simplified check - full cycle detection would require graph traversal
    const hasControlFlowCycle = this.detectControlFlowCycles(workflow);
    if (hasControlFlowCycle) {
      warnings.push('Workflow may contain cycles in control flow');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static detectControlFlowCycles(workflow: Workflow): boolean {
    // Simplified cycle detection - check for edges that create back-references
    const controlFlowEdges = workflow.edges.filter(
      e => e.targetHandle === 'input' || e.sourceHandle === 'output'
    );
    
    // Build adjacency list
    const graph = new Map<string, string[]>();
    for (const edge of controlFlowEdges) {
      if (!graph.has(edge.source)) {
        graph.set(edge.source, []);
      }
      graph.get(edge.source)!.push(edge.target);
    }

    // Simple check: if any node can reach itself, there's a cycle
    for (const [startNode] of graph) {
      const visited = new Set<string>();
      if (this.hasPath(graph, startNode, startNode, visited)) {
        return true;
      }
    }

    return false;
  }

  private static hasPath(
    graph: Map<string, string[]>,
    start: string,
    target: string,
    visited: Set<string>
  ): boolean {
    if (visited.has(start)) {
      return false;
    }
    visited.add(start);

    const neighbors = graph.get(start) || [];
    for (const neighbor of neighbors) {
      if (neighbor === target) {
        return true;
      }
      if (this.hasPath(graph, neighbor, target, visited)) {
        return true;
      }
    }

    return false;
  }
}
