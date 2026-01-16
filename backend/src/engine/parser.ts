import { Workflow, BaseNode, Edge, NodeType } from '@automflows/shared';
import { getAllReusableScopes } from '../utils/reusableFlowExtractor';

export interface ExecutionNode {
  node: BaseNode;
  dependencies: string[]; // IDs of nodes that must execute before this one
  dependents: string[]; // IDs of nodes that depend on this one
}

export class WorkflowParser {
  private nodes: Map<string, ExecutionNode>;
  private edges: Edge[];
  private startNodeId: string | null = null;
  private workflow: Workflow;
  private reusableScopes: Map<string, Set<string>> | null = null;

  constructor(workflow: Workflow) {
    this.workflow = workflow;
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
        // Both driver (control flow) and property input connections create dependencies
        // Target depends on source (for both control flow and data flow)
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
   * Get all reusable scopes in the workflow
   * @returns Map of reusable node ID to set of node IDs in that scope
   */
  getReusableScopes(): Map<string, Set<string>> {
    if (this.reusableScopes === null) {
      this.reusableScopes = getAllReusableScopes(this.workflow);
    }
    return this.reusableScopes;
  }

  /**
   * Check if a node belongs to any reusable scope
   * @param nodeId The node ID to check
   * @returns The reusable node ID if the node belongs to a reusable scope, null otherwise
   */
  getReusableScopeForNode(nodeId: string): string | null {
    const scopes = this.getReusableScopes();
    for (const [reusableNodeId, scope] of scopes.entries()) {
      if (scope.has(nodeId)) {
        return reusableNodeId;
      }
    }
    return null;
  }

  /**
   * Perform topological sort to determine execution order
   * Filters out nodes that belong to reusable scopes (they're executed via Run Reusable)
   * @param excludeReusableScopes Whether to exclude nodes in reusable scopes (default: true)
   * @returns Array of node IDs in execution order
   */
  getExecutionOrder(excludeReusableScopes: boolean = true): string[] {
    if (!this.startNodeId) {
      throw new Error('No start node found in workflow');
    }

    const visited = new Set<string>();
    const result: string[] = [];
    const visiting = new Set<string>();
    
    // Get reusable scopes if we need to exclude them
    const reusableScopes = excludeReusableScopes ? this.getReusableScopes() : new Map<string, Set<string>>();
    const allReusableScopeNodes = new Set<string>();
    for (const scope of reusableScopes.values()) {
      for (const nodeId of scope) {
        allReusableScopeNodes.add(nodeId);
      }
    }

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
        const node = executionNode.node;
        
        // Skip Reusable and End nodes in main execution
        if (excludeReusableScopes && (node.type === 'reusable.reusable' || node.type === 'reusable.end')) {
          visiting.delete(nodeId);
          visited.add(nodeId);
          return;
        }
        
        // Skip nodes that belong to reusable scopes (unless we're executing a reusable flow)
        if (excludeReusableScopes && allReusableScopeNodes.has(nodeId)) {
          visiting.delete(nodeId);
          visited.add(nodeId);
          return;
        }

        // Visit all dependencies first (backward traversal for correct ordering)
        for (const depId of executionNode.dependencies) {
          visit(depId);
        }

        visiting.delete(nodeId);
        visited.add(nodeId);
        result.push(nodeId);
        
        // Visit all dependents (forward traversal to continue from this node)
        // This ensures we traverse the entire connected graph from start
        for (const dependentId of executionNode.dependents) {
          visit(dependentId);
        }
      }
    };

    // Start from start node
    visit(this.startNodeId);

    // After visiting from start, visit any remaining nodes that are reachable
    // (have at least one visited node as a dependency) but weren't visited yet
    // This handles cases where the graph traversal didn't catch all connected nodes
    // But we skip truly disconnected nodes (nodes with no dependencies on visited nodes)
    let changed = true;
    while (changed) {
      changed = false;
      for (const nodeId of this.nodes.keys()) {
        if (!visited.has(nodeId)) {
          const executionNode = this.nodes.get(nodeId);
          if (executionNode) {
            // Check if this node has at least one visited dependency (is reachable)
            const hasVisitedDependency = executionNode.dependencies.some(depId => visited.has(depId));
            if (hasVisitedDependency) {
              visit(nodeId);
              changed = true;
            }
          }
        }
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

  /**
   * Get all nodes reachable from a specific output handle of a switch node
   * @param nodeId The switch node ID
   * @param sourceHandle The output handle ID (e.g., "case-1", "case-2", "default")
   * @returns Array of node IDs reachable from the specified handle
   */
  getNodesReachableFromHandle(nodeId: string, sourceHandle: string): string[] {
    const reachable = new Set<string>();
    const visited = new Set<string>();

    const visit = (currentNodeId: string, isInitialNode: boolean = false): void => {
      if (visited.has(currentNodeId)) {
        return;
      }
      visited.add(currentNodeId);
      
      // Don't add the switch node itself to reachable nodes
      if (!isInitialNode) {
        reachable.add(currentNodeId);
      }

      // Find edges from this node
      let outgoingEdges: Edge[];
      if (isInitialNode) {
        // For the switch node, only follow edges from the specified handle
        outgoingEdges = this.edges.filter(
          edge => edge.source === currentNodeId && edge.sourceHandle === sourceHandle
        );
      } else {
        // For other nodes, follow all control flow edges (output handle or no handle)
        outgoingEdges = this.edges.filter(
          edge => edge.source === currentNodeId && (!edge.sourceHandle || edge.sourceHandle === 'output')
        );
      }

      // Follow control flow edges
      for (const edge of outgoingEdges) {
        const targetNode = this.nodes.get(edge.target);
        if (targetNode) {
          // For switch node outputs (isInitialNode=true), follow all edges regardless of targetHandle
          // because switch nodes only have control flow outputs (case handles), not property outputs
          // For other nodes, follow control flow connections (driver, input, or no handle)
          // Skip property input connections (which have specific property names as targetHandle)
          if (isInitialNode) {
            // Switch node: follow all edges (they're all control flow)
            visit(edge.target, false);
          } else {
            // Other nodes: follow control flow edges (driver, input, or no handle)
            // Property input connections have specific property names, not 'driver' or 'input'
            if (!edge.targetHandle || edge.targetHandle === 'driver' || edge.targetHandle === 'input') {
              visit(edge.target, false);
            }
          }
        }
      }
    };

    visit(nodeId, true); // Start from switch node
    return Array.from(reachable);
  }

  /**
   * Get all output handles for a switch node
   * @param nodeId The switch node ID
   * @returns Array of source handle IDs (e.g., ["case-1", "case-2", "default"])
   */
  getSwitchOutputHandles(nodeId: string): string[] {
    const handles = new Set<string>();
    for (const edge of this.edges) {
      if (edge.source === nodeId && edge.sourceHandle) {
        handles.add(edge.sourceHandle);
      }
    }
    return Array.from(handles);
  }

  validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

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

    // Validate reusable flows
    const reusableScopes = this.getReusableScopes();
    const contextNames = new Map<string, string>(); // contextName -> reusableNodeId
    
    for (const [reusableNodeId, scope] of reusableScopes.entries()) {
      const reusableNode = this.nodes.get(reusableNodeId)?.node;
      if (reusableNode) {
        const data = reusableNode.data as any;
        const contextName = data?.contextName;
        
        if (!contextName || contextName.trim() === '') {
          errors.push(`Reusable node ${reusableNodeId} must have a context name`);
        } else {
          // Check for duplicate context names
          if (contextNames.has(contextName)) {
            errors.push(`Duplicate context name "${contextName}" found in reusable nodes ${contextNames.get(contextName)} and ${reusableNodeId}`);
          } else {
            contextNames.set(contextName, reusableNodeId);
          }
          
          // Check if reusable flow has an End node
          let hasEndNode = false;
          for (const nodeId of scope) {
            const node = this.nodes.get(nodeId)?.node;
            if (node && node.type === 'reusable.end') {
              hasEndNode = true;
              break;
            }
          }
          
          if (!hasEndNode) {
            warnings.push(`Reusable flow "${contextName}" (node ${reusableNodeId}) does not have an End node`);
          }
        }
      }
    }
    
    // Validate Run Reusable nodes
    for (const node of this.getAllNodes()) {
      if (node.type === 'reusable.runReusable') {
        const data = node.data as any;
        const contextName = data?.contextName;
        
        if (!contextName || contextName.trim() === '') {
          errors.push(`Run Reusable node ${node.id} must specify a context name`);
        } else if (!contextNames.has(contextName)) {
          errors.push(`Run Reusable node ${node.id} references non-existent reusable flow "${contextName}"`);
        }
      }
    }

    // Check for nodes with multiple control flow (driver) input connections
    // Property input connections are allowed multiple times, but driver (control flow) should be unique
    // Switch nodes are allowed to have multiple output handles, so skip validation for switch node outputs
    const driverConnections = new Map<string, number>();
    for (const edge of this.edges) {
      // Only count driver handle connections (control flow), not property input handles
      if (!edge.targetHandle || edge.targetHandle === 'driver') {
        const count = driverConnections.get(edge.target) || 0;
        driverConnections.set(edge.target, count + 1);
      }
    }

    for (const [nodeId, count] of driverConnections.entries()) {
      const node = this.nodes.get(nodeId);
      if (node && node.node.type !== NodeType.START && count > 1) {
        errors.push(`Node ${nodeId} has multiple control flow input connections (only one driver connection allowed)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

