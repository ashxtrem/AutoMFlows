import { BaseNode, NodeType, PropertyDataType, Workflow, Edge } from '@automflows/shared';
import { WorkflowParser } from '../parser';
import { ContextManager } from '../context';
import { TypeConverter } from '../../utils/typeConverter';

/**
 * Resolve property input connections for a node
 * Finds edges targeting property handles and resolves their values
 */
export function resolvePropertyInputs(
  node: BaseNode,
  workflow: Workflow,
  parser: WorkflowParser,
  context: ContextManager,
  traceLog: (message: string) => void
): BaseNode {
  const nodeData = node.data as any;
  const inputConnections = nodeData._inputConnections || {};
  
  if (Object.keys(inputConnections).length === 0) {
    return node; // No input connections to resolve
  }

  const resolvedData = { ...nodeData };
  const allNodes = parser.getAllNodes();
  
  // Resolve each property input connection
  for (const [propertyName, connectionInfo] of Object.entries(inputConnections)) {
    // Check if this property is actually converted to input
    if (!connectionInfo || (connectionInfo as any).isInput !== true) {
      continue;
    }
    
    const handleId = `${propertyName}-input`;
    
    // Find edge connecting to this property handle
    const edge = workflow.edges.find(
      e => e.target === node.id && e.targetHandle === handleId
    );
    
    if (edge && edge.source) {
      // Find source node using edge.source
      const sourceNode = allNodes.find(n => n.id === edge.source);
      if (sourceNode) {
        // Get value from source node (it should have been executed already)
        // Value nodes store their value in context with their node ID as key
        const sourceValue = context.getVariable(edge.source);
        
        if (sourceValue !== undefined) {
          // Determine source and target types for conversion
          let sourceType: PropertyDataType;
          if (sourceNode.type === NodeType.INT_VALUE) {
            sourceType = PropertyDataType.INT;
          } else if (sourceNode.type === NodeType.STRING_VALUE) {
            sourceType = PropertyDataType.STRING;
          } else if (sourceNode.type === NodeType.BOOLEAN_VALUE) {
            sourceType = PropertyDataType.BOOLEAN;
          } else if (sourceNode.type === NodeType.INPUT_VALUE) {
            // Get dataType from INPUT_VALUE node
            sourceType = (sourceNode.data as any).dataType || PropertyDataType.STRING;
          } else {
            sourceType = TypeConverter.inferType(sourceValue);
          }
          
          // Get target property type (we'll need to infer from property name or use default)
          // For now, use the source type or infer from the value
          let targetType = sourceType;
          
          // Apply type conversion if needed
          try {
            const convertedValue = TypeConverter.convert(sourceValue, sourceType, targetType);
            resolvedData[propertyName] = convertedValue;
            traceLog(`[TRACE] Resolved property ${propertyName} = ${convertedValue} (${sourceType} → ${targetType})`);
          } catch (error: any) {
            // If conversion fails, use the value as-is
            resolvedData[propertyName] = sourceValue;
            traceLog(`[TRACE] Using unconverted value for ${propertyName}: ${sourceValue}`);
          }
        } else {
          traceLog(`[TRACE] Warning: Source value not found for property ${propertyName} from node ${edge.source}`);
        }
      }
    } else {
      traceLog(`[TRACE] Warning: No edge found for property input ${propertyName} on node ${node.id}`);
    }
  }
  
  return {
    ...node,
    data: resolvedData,
  };
}
