import { Workflow, BaseNode, Edge, NodeType } from '@automflows/shared';

/**
 * Utilities for modifying existing workflows
 */
export class WorkflowModifier {
  /**
   * Insert a node after the target node
   */
  static insertNodeAfter(
    workflow: Workflow,
    targetNodeId: string,
    newNode: BaseNode
  ): Workflow {
    const modifiedWorkflow = this.deepClone(workflow);
    const targetIndex = modifiedWorkflow.nodes.findIndex(n => n.id === targetNodeId);
    
    if (targetIndex === -1) {
      throw new Error(`Target node ${targetNodeId} not found`);
    }

    // Calculate position for new node (to the right of target)
    const targetNode = modifiedWorkflow.nodes[targetIndex];
    const newPosition = {
      x: targetNode.position.x + 300,
      y: targetNode.position.y,
    };
    
    newNode.position = newPosition;
    newNode.id = newNode.id || `${newNode.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert node after target
    modifiedWorkflow.nodes.splice(targetIndex + 1, 0, newNode);

    // Find outgoing edges from target node
    const outgoingEdges = modifiedWorkflow.edges.filter(e => e.source === targetNodeId);
    
    // Reconnect edges: target -> newNode -> original targets
    for (const edge of outgoingEdges) {
      // Remove original edge
      const edgeIndex = modifiedWorkflow.edges.findIndex(e => e.id === edge.id);
      if (edgeIndex !== -1) {
        modifiedWorkflow.edges.splice(edgeIndex, 1);
      }
      
      // Create edge from target to new node
      modifiedWorkflow.edges.push({
        id: `edge-${targetNodeId}-${newNode.id}-${Date.now()}`,
        source: targetNodeId,
        target: newNode.id,
        sourceHandle: edge.sourceHandle || 'output',
        targetHandle: 'input',
      });
      
      // Create edge from new node to original target
      modifiedWorkflow.edges.push({
        id: `edge-${newNode.id}-${edge.target}-${Date.now()}`,
        source: newNode.id,
        target: edge.target,
        sourceHandle: 'output',
        targetHandle: edge.targetHandle || 'input',
      });
    }

    // If no outgoing edges, just connect target to new node
    if (outgoingEdges.length === 0) {
      modifiedWorkflow.edges.push({
        id: `edge-${targetNodeId}-${newNode.id}-${Date.now()}`,
        source: targetNodeId,
        target: newNode.id,
        sourceHandle: 'output',
        targetHandle: 'input',
      });
    }

    return modifiedWorkflow;
  }

  /**
   * Insert a node before the target node
   */
  static insertNodeBefore(
    workflow: Workflow,
    targetNodeId: string,
    newNode: BaseNode
  ): Workflow {
    const modifiedWorkflow = this.deepClone(workflow);
    const targetIndex = modifiedWorkflow.nodes.findIndex(n => n.id === targetNodeId);
    
    if (targetIndex === -1) {
      throw new Error(`Target node ${targetNodeId} not found`);
    }

    // Calculate position for new node (to the left of target)
    const targetNode = modifiedWorkflow.nodes[targetIndex];
    const newPosition = {
      x: targetNode.position.x - 300,
      y: targetNode.position.y,
    };
    
    newNode.position = newPosition;
    newNode.id = newNode.id || `${newNode.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert node before target
    modifiedWorkflow.nodes.splice(targetIndex, 0, newNode);

    // Find incoming edges to target node
    const incomingEdges = modifiedWorkflow.edges.filter(e => e.target === targetNodeId);
    
    // Reconnect edges: original sources -> newNode -> target
    for (const edge of incomingEdges) {
      // Remove original edge
      const edgeIndex = modifiedWorkflow.edges.findIndex(e => e.id === edge.id);
      if (edgeIndex !== -1) {
        modifiedWorkflow.edges.splice(edgeIndex, 1);
      }
      
      // Create edge from original source to new node
      modifiedWorkflow.edges.push({
        id: `edge-${edge.source}-${newNode.id}-${Date.now()}`,
        source: edge.source,
        target: newNode.id,
        sourceHandle: edge.sourceHandle || 'output',
        targetHandle: 'input',
      });
      
      // Create edge from new node to target
      modifiedWorkflow.edges.push({
        id: `edge-${newNode.id}-${targetNodeId}-${Date.now()}`,
        source: newNode.id,
        target: targetNodeId,
        sourceHandle: 'output',
        targetHandle: edge.targetHandle || 'input',
      });
    }

    // If no incoming edges, just connect new node to target
    if (incomingEdges.length === 0) {
      modifiedWorkflow.edges.push({
        id: `edge-${newNode.id}-${targetNodeId}-${Date.now()}`,
        source: newNode.id,
        target: targetNodeId,
        sourceHandle: 'output',
        targetHandle: 'input',
      });
    }

    return modifiedWorkflow;
  }

  /**
   * Insert a node between two connected nodes
   */
  static insertNodeBetween(
    workflow: Workflow,
    sourceNodeId: string,
    targetNodeId: string,
    newNode: BaseNode
  ): Workflow {
    const modifiedWorkflow = this.deepClone(workflow);
    
    // Find the edge connecting source to target
    const connectingEdge = modifiedWorkflow.edges.find(
      e => e.source === sourceNodeId && e.target === targetNodeId
    );
    
    if (!connectingEdge) {
      throw new Error(`No edge found between ${sourceNodeId} and ${targetNodeId}`);
    }

    // Calculate position for new node (between source and target)
    const sourceNode = modifiedWorkflow.nodes.find(n => n.id === sourceNodeId);
    const targetNode = modifiedWorkflow.nodes.find(n => n.id === targetNodeId);
    
    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found');
    }

    const newPosition = {
      x: (sourceNode.position.x + targetNode.position.x) / 2,
      y: (sourceNode.position.y + targetNode.position.y) / 2,
    };
    
    newNode.position = newPosition;
    newNode.id = newNode.id || `${newNode.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add new node
    modifiedWorkflow.nodes.push(newNode);

    // Remove original edge
    const edgeIndex = modifiedWorkflow.edges.findIndex(e => e.id === connectingEdge.id);
    if (edgeIndex !== -1) {
      modifiedWorkflow.edges.splice(edgeIndex, 1);
    }

    // Create edge from source to new node
    modifiedWorkflow.edges.push({
      id: `edge-${sourceNodeId}-${newNode.id}-${Date.now()}`,
      source: sourceNodeId,
      target: newNode.id,
      sourceHandle: connectingEdge.sourceHandle || 'output',
      targetHandle: 'input',
    });

    // Create edge from new node to target
    modifiedWorkflow.edges.push({
      id: `edge-${newNode.id}-${targetNodeId}-${Date.now()}`,
      source: newNode.id,
      target: targetNodeId,
      sourceHandle: 'output',
      targetHandle: connectingEdge.targetHandle || 'input',
    });

    return modifiedWorkflow;
  }

  /**
   * Add a node at the end of the workflow
   */
  static addNodeAtEnd(
    workflow: Workflow,
    newNode: BaseNode
  ): Workflow {
    const modifiedWorkflow = this.deepClone(workflow);
    
    // Find the last node (node with no outgoing edges or furthest right)
    const nodesWithOutgoing = new Set(modifiedWorkflow.edges.map(e => e.source));
    const endNodes = modifiedWorkflow.nodes.filter(n => !nodesWithOutgoing.has(n.id));
    
    let lastNode: BaseNode | undefined;
    if (endNodes.length > 0) {
      // Use the rightmost end node
      lastNode = endNodes.reduce((rightmost, node) => 
        node.position.x > rightmost.position.x ? node : rightmost
      );
    } else {
      // Fallback: use rightmost node
      lastNode = modifiedWorkflow.nodes.reduce((rightmost, node) => 
        node.position.x > rightmost.position.x ? node : rightmost
      );
    }

    if (lastNode) {
      return this.insertNodeAfter(modifiedWorkflow, lastNode.id, newNode);
    }

    // If no nodes found, just add the node
    const newPosition = {
      x: 100,
      y: 200,
    };
    
    newNode.position = newPosition;
    newNode.id = newNode.id || `${newNode.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    modifiedWorkflow.nodes.push(newNode);

    return modifiedWorkflow;
  }

  /**
   * Update selector for a node
   */
  static updateNodeSelector(
    workflow: Workflow,
    nodeId: string,
    newSelector: string
  ): Workflow {
    const modifiedWorkflow = this.deepClone(workflow);
    const nodeIndex = modifiedWorkflow.nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex === -1) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const node = modifiedWorkflow.nodes[nodeIndex];
    if (node.data && typeof node.data === 'object') {
      (node.data as any).selector = newSelector;
    }

    return modifiedWorkflow;
  }

  /**
   * Update a property of a node
   */
  static updateNodeProperty(
    workflow: Workflow,
    nodeId: string,
    property: string,
    value: any
  ): Workflow {
    const modifiedWorkflow = this.deepClone(workflow);
    const nodeIndex = modifiedWorkflow.nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex === -1) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const node = modifiedWorkflow.nodes[nodeIndex];
    if (node.data && typeof node.data === 'object') {
      (node.data as any)[property] = value;
    }

    return modifiedWorkflow;
  }

  /**
   * Bulk update selectors for multiple nodes
   */
  static bulkUpdateSelectors(
    workflow: Workflow,
    selectorMap: Record<string, string>
  ): Workflow {
    let modifiedWorkflow = workflow;
    
    for (const [nodeId, newSelector] of Object.entries(selectorMap)) {
      modifiedWorkflow = this.updateNodeSelector(modifiedWorkflow, nodeId, newSelector);
    }

    return modifiedWorkflow;
  }

  /**
   * Add assertion (verify node) after target node
   */
  static addAssertionAfter(
    workflow: Workflow,
    nodeId: string,
    assertionConfig: {
      domain: string;
      verificationType: string;
      selector?: string;
      expectedValue?: string | number;
      label?: string;
    }
  ): Workflow {
    const verifyNode: BaseNode = {
      id: `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: NodeType.VERIFY,
      position: { x: 0, y: 0 }, // Will be calculated by insertNodeAfter
      data: {
        type: NodeType.VERIFY,
        label: assertionConfig.label || 'Verify',
        domain: assertionConfig.domain,
        verificationType: assertionConfig.verificationType,
        selector: assertionConfig.selector,
        expectedValue: assertionConfig.expectedValue,
      },
    };

    return this.insertNodeAfter(workflow, nodeId, verifyNode);
  }

  /**
   * Add assertion (verify node) before target node
   */
  static addAssertionBefore(
    workflow: Workflow,
    nodeId: string,
    assertionConfig: {
      domain: string;
      verificationType: string;
      selector?: string;
      expectedValue?: string | number;
      label?: string;
    }
  ): Workflow {
    const verifyNode: BaseNode = {
      id: `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: NodeType.VERIFY,
      position: { x: 0, y: 0 }, // Will be calculated by insertNodeBefore
      data: {
        type: NodeType.VERIFY,
        label: assertionConfig.label || 'Verify',
        domain: assertionConfig.domain,
        verificationType: assertionConfig.verificationType,
        selector: assertionConfig.selector,
        expectedValue: assertionConfig.expectedValue,
      },
    };

    return this.insertNodeBefore(workflow, nodeId, verifyNode);
  }

  /**
   * Find insertion point based on description
   */
  static findInsertionPoint(
    workflow: Workflow,
    description: string
  ): { nodeId: string; position: 'before' | 'after' } | null {
    const descLower = description.toLowerCase();
    
    // Search by node label
    for (const node of workflow.nodes) {
      const label = (node.data as any)?.label || '';
      const labelLower = label.toLowerCase();
      
      if (labelLower.includes(descLower) || descLower.includes(labelLower)) {
        // Determine position based on description
        if (description.toLowerCase().includes('before')) {
          return { nodeId: node.id, position: 'before' };
        }
        return { nodeId: node.id, position: 'after' };
      }
    }

    // Search by node type
    const typeKeywords: Record<string, string[]> = {
      'login': ['click', 'action'],
      'navigate': ['navigation', 'navigate'],
      'form': ['type', 'formInput'],
      'api': ['apiRequest', 'apiCurl'],
      'verify': ['verify'],
    };

    for (const [keyword, nodeTypes] of Object.entries(typeKeywords)) {
      if (descLower.includes(keyword)) {
        const matchingNode = workflow.nodes.find(n => 
          nodeTypes.includes(n.type.toLowerCase())
        );
        if (matchingNode) {
          return { nodeId: matchingNode.id, position: 'after' };
        }
      }
    }

    return null;
  }

  /**
   * Find nodes by type
   */
  static findNodesByType(workflow: Workflow, nodeType: string): BaseNode[] {
    return workflow.nodes.filter(n => 
      n.type.toLowerCase() === nodeType.toLowerCase()
    );
  }

  /**
   * Find nodes by selector
   */
  static findNodesBySelector(workflow: Workflow, selector: string): BaseNode[] {
    return workflow.nodes.filter(n => {
      const nodeSelector = (n.data as any)?.selector;
      return nodeSelector && (
        nodeSelector === selector || 
        nodeSelector.includes(selector) ||
        selector.includes(nodeSelector)
      );
    });
  }

  /**
   * Insert wait node before target node with breakpoint configuration
   */
  static insertWaitNodeBefore(
    workflow: Workflow,
    targetNodeId: string,
    breakpointConfig: {
      pause: boolean;
      breakpointAt: 'pre' | 'post' | 'both';
      breakpointFor: 'all' | 'marked';
    }
  ): { workflow: Workflow; waitNodeId: string } {
    const modifiedWorkflow = this.deepClone(workflow);
    const targetIndex = modifiedWorkflow.nodes.findIndex(n => n.id === targetNodeId);
    
    if (targetIndex === -1) {
      throw new Error(`Target node ${targetNodeId} not found`);
    }

    // Create wait node with pause enabled
    const waitNode: BaseNode = {
      id: `wait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: NodeType.WAIT,
      position: {
        x: modifiedWorkflow.nodes[targetIndex].position.x - 300,
        y: modifiedWorkflow.nodes[targetIndex].position.y,
      },
      data: {
        type: NodeType.WAIT,
        label: 'Wait (Breakpoint)',
        waitType: 'timeout',
        value: 1000, // 1 second timeout (will be paused anyway)
        timeout: 1000,
        pause: breakpointConfig.pause,
        // Mark node for breakpoint if breakpointFor === 'marked'
        breakpoint: breakpointConfig.breakpointFor === 'marked',
      },
    };

    // Insert wait node before target
    modifiedWorkflow.nodes.splice(targetIndex, 0, waitNode);

    // Find incoming edges to target node
    const incomingEdges = modifiedWorkflow.edges.filter(e => e.target === targetNodeId);
    
    // Reconnect edges: original sources -> waitNode -> target
    for (const edge of incomingEdges) {
      // Remove original edge
      const edgeIndex = modifiedWorkflow.edges.findIndex(e => e.id === edge.id);
      if (edgeIndex !== -1) {
        modifiedWorkflow.edges.splice(edgeIndex, 1);
      }
      
      // Create edge from original source to wait node
      modifiedWorkflow.edges.push({
        id: `edge-${edge.source}-${waitNode.id}-${Date.now()}`,
        source: edge.source,
        target: waitNode.id,
        sourceHandle: edge.sourceHandle || 'output',
        targetHandle: 'input',
      });
      
      // Create edge from wait node to target
      modifiedWorkflow.edges.push({
        id: `edge-${waitNode.id}-${targetNodeId}-${Date.now()}`,
        source: waitNode.id,
        target: targetNodeId,
        sourceHandle: 'output',
        targetHandle: edge.targetHandle || 'input',
      });
    }

    // If no incoming edges, just connect wait node to target
    if (incomingEdges.length === 0) {
      modifiedWorkflow.edges.push({
        id: `edge-${waitNode.id}-${targetNodeId}-${Date.now()}`,
        source: waitNode.id,
        target: targetNodeId,
        sourceHandle: 'output',
        targetHandle: 'input',
      });
    }

    return { workflow: modifiedWorkflow, waitNodeId: waitNode.id };
  }

  /**
   * Deep clone workflow
   */
  private static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
