import { Node, Edge } from 'reactflow';
import { Workflow, BaseNode as WorkflowNode, Edge as WorkflowEdge, NodeType } from '@automflows/shared';

export function serializeWorkflow(nodes: Node[], edges: Edge[]): Workflow {
  const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.data.type as NodeType,
    position: node.position,
    data: {
      ...node.data,
      // Remove ReactFlow-specific fields
      label: undefined,
      isExecuting: undefined,
    },
  }));

  const workflowEdges: WorkflowEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
  }));

  return {
    nodes: workflowNodes,
    edges: workflowEdges,
  };
}

export function deserializeWorkflow(workflow: Workflow): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = workflow.nodes.map((node) => ({
    id: node.id,
    type: 'custom',
    position: node.position,
    width: node.data.width,
    height: node.data.height,
    data: {
      ...node.data,
      type: node.type,
      label: getNodeLabel(node.type),
    },
  }));

  const edges: Edge[] = workflow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || 'output',
    targetHandle: edge.targetHandle || 'input',
  }));

  return { nodes, edges };
}

function getNodeLabel(type: NodeType): string {
  const labels: Record<NodeType, string> = {
    [NodeType.START]: 'Start',
    [NodeType.OPEN_BROWSER]: 'Open Browser',
    [NodeType.NAVIGATE]: 'Navigate',
    [NodeType.CLICK]: 'Click',
    [NodeType.TYPE]: 'Type',
    [NodeType.GET_TEXT]: 'Get Text',
    [NodeType.SCREENSHOT]: 'Screenshot',
    [NodeType.WAIT]: 'Wait',
    [NodeType.JAVASCRIPT_CODE]: 'JavaScript Code',
    [NodeType.LOOP]: 'Loop',
  };
  return labels[type] || type;
}

export function saveToLocalStorage(nodes: Node[], edges: Edge[]): void {
  const workflow = serializeWorkflow(nodes, edges);
  localStorage.setItem('automflows-workflow', JSON.stringify(workflow));
}

export function loadFromLocalStorage(): { nodes: Node[]; edges: Edge[] } | null {
  const stored = localStorage.getItem('automflows-workflow');
  if (!stored) {
    return null;
  }

  try {
    const workflow = JSON.parse(stored) as Workflow;
    return deserializeWorkflow(workflow);
  } catch (error) {
    console.error('Failed to load workflow from localStorage:', error);
    return null;
  }
}

