import { Node, Edge } from 'reactflow';
import { getNodeProperties, isPropertyInputConnection, getPropertyInputHandleId } from './nodeProperties';

export interface ValidationError {
  nodeId: string;
  nodeName: string;
  propertyName: string;
  propertyLabel: string;
  message: string;
}

/**
 * Validate workflow for missing input connections
 * Checks ALL properties that are converted to input (not just required ones)
 */
export function validateInputConnections(nodes: Node[], edges: Edge[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const node of nodes) {
    const nodeType = node.data.type;
    const properties = getNodeProperties(nodeType);

    for (const property of properties) {
      // Check if property is converted to input
      if (isPropertyInputConnection(node.data, property.name)) {
        // Check if there's an edge connecting to this property handle
        const handleId = getPropertyInputHandleId(property.name);
        const hasConnection = edges.some(
          e => e.target === node.id && e.targetHandle === handleId
        );

        // If not connected, add error (check ALL convert-to-input properties, not just required)
        if (!hasConnection) {
          const nodeName = node.data.label || nodeType;
          errors.push({
            nodeId: node.id,
            nodeName,
            propertyName: property.name,
            propertyLabel: property.label,
            message: `Property "${property.label}" is converted to input but not connected`,
          });
        }
      }
    }
  }

  return errors;
}

