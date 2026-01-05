import { Workflow, BaseNode, Edge, NodeType } from '@automflows/shared';

export interface ExecutionNode {
  node: BaseNode;
  dependencies: string[]; // IDs of nodes that must execute before this one
  dependents: string[]; // IDs of nodes that depend on this one
}

export class WorkflowParser {
  private nodes: Map<string, ExecutionNode>;
  private edges: Edge[];
  private startNodeId: string | null = null;

  constructor(workflow: Workflow) {
    this.edges = workflow.edges;
    this.nodes = new Map();

    // Build node map
    for (const node of workflow.nodes) {
      this.nodes.set(node.id, {
        node,
        dependencies: [],
        dependents: [],
      });
    }

    // Find start node
    for (const node of workflow.nodes) {
      if (node.type === NodeType.START) {
        this.startNodeId = node.id;
        break;
      }
    }

    // Build dependency graph
    this.buildDependencyGraph();
  }

  private buildDependencyGraph(): void {
    for (const edge of this.edges) {
      const sourceNode = this.nodes.get(edge.source);
      const targetNode = this.nodes.get(edge.target);

      if (sourceNode && targetNode) {
        // Target depends on source
        if (!targetNode.dependencies.includes(edge.source)) {
          targetNode.dependencies.push(edge.source);
        }
        // Source has target as dependent
        if (!sourceNode.dependents.includes(edge.target)) {
          sourceNode.dependents.push(edge.target);
        }
      }
    }
  }

  /**
   * Perform topological sort to determine execution order
   * Returns array of node IDs in execution order
   */
  getExecutionOrder(): string[] {
    if (!this.startNodeId) {
      throw new Error('No start node found in workflow');
    }

    const visited = new Set<string>();
    const result: string[] = [];
    const visiting = new Set<string>();

    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node: ${nodeId}`);
      }

      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);
      const executionNode = this.nodes.get(nodeId);

      if (executionNode) {
        // Visit all dependencies first
        for (const depId of executionNode.dependencies) {
          visit(depId);
        }

        visiting.delete(nodeId);
        visited.add(nodeId);
        result.push(nodeId);
      }
    };

    // Start from start node
    visit(this.startNodeId);

    // Visit any remaining nodes (in case of disconnected graph)
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    return result;
  }

  getNode(nodeId: string): BaseNode | undefined {
    return this.nodes.get(nodeId)?.node;
  }

  getExecutionNode(nodeId: string): ExecutionNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): BaseNode[] {
    return Array.from(this.nodes.values()).map((en) => en.node);
  }

  getStartNodeId(): string | null {
    return this.startNodeId;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for start node
    if (!this.startNodeId) {
      errors.push('Workflow must contain a Start node');
    }

    // Check for circular dependencies
    try {
      this.getExecutionOrder();
    } catch (error: any) {
      errors.push(error.message);
    }

    // Check for nodes with multiple input connections
    const inputConnections = new Map<string, number>();
    for (const edge of this.edges) {
      const count = inputConnections.get(edge.target) || 0;
      inputConnections.set(edge.target, count + 1);
    }

    for (const [nodeId, count] of inputConnections.entries()) {
      const node = this.nodes.get(nodeId);
      if (node && node.node.type !== NodeType.START && count > 1) {
        errors.push(`Node ${nodeId} has multiple input connections (only one allowed)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

