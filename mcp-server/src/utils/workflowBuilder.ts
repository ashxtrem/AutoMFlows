import { Workflow, BaseNode, Edge, NodeType } from '@automflows/shared';
import { v4 as uuidv4 } from 'uuid';

export interface NodePosition {
  x: number;
  y: number;
}

export class WorkflowBuilder {
  private nodes: BaseNode[] = [];
  private edges: Edge[] = [];
  private nodePositions: Map<string, NodePosition> = new Map();
  private currentX = 100;
  private currentY = 200;
  private xSpacing = 300;
  private ySpacing = 250;

  constructor() {
    // Initialize with Start node
    this.addStartNode();
  }

  private addStartNode(): void {
    const startId = `start-${Date.now()}`;
    const startNode: BaseNode = {
      id: startId,
      type: NodeType.START,
      position: { x: this.currentX, y: this.currentY },
      data: {
        type: NodeType.START,
        label: 'Start',
      },
    };
    this.nodes.push(startNode);
    this.nodePositions.set(startId, { x: this.currentX, y: this.currentY });
    this.currentX += this.xSpacing;
  }

  addNode(
    type: NodeType | string,
    data: Record<string, any>,
    position?: NodePosition
  ): string {
    const nodeId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pos = position || { x: this.currentX, y: this.currentY };
    
    const node: BaseNode = {
      id: nodeId,
      type,
      position: pos,
      data: {
        type,
        label: data.label || type,
        ...data,
      },
    };
    
    this.nodes.push(node);
    this.nodePositions.set(nodeId, pos);
    this.currentX += this.xSpacing;
    
    return nodeId;
  }

  addEdge(
    sourceId: string,
    targetId: string,
    sourceHandle: string = 'output',
    targetHandle: string = 'input'
  ): void {
    const edgeId = `edge-${sourceId}-${targetId}-${sourceHandle}-${targetHandle}`;
    const edge: Edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      sourceHandle,
      targetHandle,
    };
    this.edges.push(edge);
  }

  connectNodes(
    sourceId: string,
    targetId: string,
    sourceHandle: string = 'output',
    targetHandle: string = 'input'
  ): void {
    this.addEdge(sourceId, targetId, sourceHandle, targetHandle);
  }

  connectPropertyInput(
    sourceId: string,
    targetId: string,
    propertyName: string
  ): void {
    this.addEdge(sourceId, targetId, 'output', `${propertyName}-input`);
  }

  build(): Workflow {
    return {
      nodes: this.nodes,
      edges: this.edges,
    };
  }

  reset(): void {
    this.nodes = [];
    this.edges = [];
    this.nodePositions.clear();
    this.currentX = 100;
    this.currentY = 200;
    this.addStartNode();
  }

  getLastNodeId(): string | null {
    return this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].id : null;
  }

  getStartNodeId(): string | null {
    const startNode = this.nodes.find(n => n.type === NodeType.START);
    return startNode ? startNode.id : null;
  }

  /**
   * Move layout cursor to the next row (resets X, increments Y).
   * Useful for building multi-row workflows.
   */
  nextRow(): void {
    this.currentX = 100;
    this.currentY += this.ySpacing;
  }

  /**
   * Add a setConfig plugin node with key-value configuration pairs.
   * Returns the node ID.
   */
  addSetConfigNode(config: Record<string, any>, label?: string): string {
    return this.addNode('setConfig.setConfig' as any, {
      label: label || 'Set Config',
      config,
    });
  }

  /**
   * Add a JavaScript code node. Returns the node ID.
   */
  addJavaScriptNode(code: string, label?: string): string {
    return this.addNode(NodeType.JAVASCRIPT_CODE, {
      label: label || 'JavaScript Code',
      code,
    });
  }

  /**
   * Add a loop node. Returns the node ID.
   * @param mode "forEach" or "doWhile"
   * @param options For forEach: { arrayVariable }. For doWhile: { condition }.
   */
  addLoopNode(
    mode: 'forEach' | 'doWhile',
    options: { arrayVariable?: string; condition?: string },
    label?: string
  ): string {
    return this.addNode(NodeType.LOOP, {
      label: label || 'Loop',
      loopMode: mode,
      arrayVariable: options.arrayVariable,
      condition: options.condition,
    });
  }

  /**
   * Connect a chain of nodes as the body of a loop.
   * Connects loop --[output]--> first body node, then chains body nodes via output/input.
   */
  addLoopBody(loopNodeId: string, bodyNodeIds: string[]): void {
    if (bodyNodeIds.length === 0) return;
    this.addEdge(loopNodeId, bodyNodeIds[0], 'output', 'input');
    for (let i = 0; i < bodyNodeIds.length - 1; i++) {
      this.addEdge(bodyNodeIds[i], bodyNodeIds[i + 1], 'output', 'input');
    }
  }

  /**
   * Connect a node after a loop using the loopComplete handle.
   * This prevents the node from being treated as part of the loop body.
   */
  addPostLoopConnection(loopNodeId: string, targetNodeId: string): void {
    this.addEdge(loopNodeId, targetNodeId, 'loopComplete', 'input');
  }

  /**
   * Add an elementQuery node. Returns the node ID.
   */
  addElementQueryNode(
    action: 'getText' | 'getAttribute' | 'getCount' | 'isVisible' | 'isEnabled' | 'isChecked' | 'getBoundingBox' | 'getAllText',
    selector: string,
    outputVariable: string,
    options?: { selectorType?: string; attributeName?: string },
    label?: string
  ): string {
    return this.addNode(NodeType.ELEMENT_QUERY, {
      label: label || `Query: ${action}`,
      action,
      selector,
      selectorType: options?.selectorType || 'css',
      outputVariable,
      attributeName: options?.attributeName,
    });
  }

  /**
   * Add a verify node. Returns the node ID.
   */
  addVerifyNode(
    domain: 'browser' | 'api',
    verificationType: string,
    options?: { selector?: string; expectedValue?: any; selectorType?: string },
    label?: string
  ): string {
    return this.addNode(NodeType.VERIFY, {
      label: label || `Verify: ${verificationType}`,
      domain,
      verificationType,
      selector: options?.selector,
      selectorType: options?.selectorType || 'css',
      expectedValue: options?.expectedValue,
    });
  }

  /**
   * Enable accessibility snapshots on the Start node so execution produces
   * snapshot files that can be used for accurate selector inference.
   */
  enableSnapshots(timing: 'pre' | 'post' | 'both' = 'post'): void {
    const startNode = this.nodes.find(n => n.type === NodeType.START);
    if (startNode) {
      (startNode.data as any).snapshotAllNodes = true;
      (startNode.data as any).snapshotTiming = timing;
    }
  }

  /**
   * Enable accessibility snapshots on an already-built Workflow object.
   * Returns a new workflow with snapshotAllNodes enabled on the Start node.
   */
  static enableSnapshotsOnWorkflow(
    workflow: Workflow,
    timing: 'pre' | 'post' | 'both' = 'post'
  ): Workflow {
    return {
      ...workflow,
      nodes: workflow.nodes.map(node => {
        if (node.type === NodeType.START) {
          return {
            ...node,
            data: {
              ...node.data,
              snapshotAllNodes: true,
              snapshotTiming: timing,
            },
          };
        }
        return node;
      }),
    };
  }
}
