import { Workflow, NodeType } from '@automflows/shared';

export interface ValidationError {
  nodeId?: string;
  field?: string;
  message: string;
}

/**
 * Validate workflow matches backend Workflow interface
 */
export function validateWorkflow(workflow: Workflow): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!workflow) {
    errors.push({ message: 'Workflow is required' });
    return errors;
  }

  if (!Array.isArray(workflow.nodes)) {
    errors.push({ message: 'Workflow.nodes must be an array' });
    return errors;
  }

  if (!Array.isArray(workflow.edges)) {
    errors.push({ message: 'Workflow.edges must be an array' });
    return errors;
  }

  // Validate nodes
  const nodeIds = new Set<string>();
  for (const node of workflow.nodes) {
    // Check for duplicate IDs
    if (nodeIds.has(node.id)) {
      errors.push({ nodeId: node.id, message: `Duplicate node ID: ${node.id}` });
    }
    nodeIds.add(node.id);

    // Validate required fields
    if (!node.id) {
      errors.push({ nodeId: node.id, message: 'Node missing required field: id' });
    }

    if (!node.type) {
      errors.push({ nodeId: node.id, message: 'Node missing required field: type' });
    }

    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      errors.push({ nodeId: node.id, message: 'Node missing required field: position' });
    }

    if (!node.data) {
      errors.push({ nodeId: node.id, message: 'Node missing required field: data' });
    }

    // Validate node type exists (either in enum or as plugin node)
    // We can't fully validate plugin nodes here, but we can check enum values
    if (node.type && !Object.values(NodeType).includes(node.type as NodeType)) {
      // This might be a plugin node, which is OK
      // We'll let the backend validate plugin nodes
    }
  }

  // Validate edges
  for (const edge of workflow.edges) {
    if (!edge.id) {
      errors.push({ message: 'Edge missing required field: id' });
    }

    if (!edge.source) {
      errors.push({ message: `Edge ${edge.id} missing required field: source` });
    } else if (!nodeIds.has(edge.source)) {
      errors.push({ message: `Edge ${edge.id} references non-existent source node: ${edge.source}` });
    }

    if (!edge.target) {
      errors.push({ message: `Edge ${edge.id} missing required field: target` });
    } else if (!nodeIds.has(edge.target)) {
      errors.push({ message: `Edge ${edge.id} references non-existent target node: ${edge.target}` });
    }
  }

  // Check for Start node
  const hasStartNode = workflow.nodes.some(node => node.type === NodeType.START);
  if (!hasStartNode) {
    errors.push({ message: 'Workflow must contain at least one Start node' });
  }

  return errors;
}
