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
      isExecuting: undefined,
      // Preserve custom label, background color, bypass, minimized state, width, height, isPinned
      // label, backgroundColor, bypass, isMinimized, width, height, isPinned are kept
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
    width: (node.data as any).width,
    height: (node.data as any).height,
    data: {
      ...node.data,
      type: node.type,
      // Preserve custom label if exists, otherwise use default
      label: (node.data as any).label || getNodeLabel(node.type as NodeType),
      // Preserve background color, bypass, minimized state, isTest, isPinned (borderColor removed)
      backgroundColor: (node.data as any).backgroundColor,
      bypass: (node.data as any).bypass,
      isMinimized: (node.data as any).isMinimized,
      isPinned: (node.data as any).isPinned || false,
      // Default isTest to true if not present (for backward compatibility)
      isTest: (node.data as any).isTest !== undefined ? (node.data as any).isTest : true,
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
    [NodeType.INT_VALUE]: 'Int Value',
    [NodeType.STRING_VALUE]: 'String Value',
    [NodeType.BOOLEAN_VALUE]: 'Boolean Value',
    [NodeType.INPUT_VALUE]: 'Input Value',
    [NodeType.VERIFY]: 'Verify',
    [NodeType.API_REQUEST]: 'API Request',
    [NodeType.API_CURL]: 'API cURL',
    [NodeType.LOAD_CONFIG_FILE]: 'Load Config File',
    [NodeType.SELECT_CONFIG_FILE]: 'Select Config File',
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

