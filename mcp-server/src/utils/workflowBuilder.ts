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
}
