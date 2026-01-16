import { EdgeProps, getBezierPath } from 'reactflow';
import { useWorkflowStore } from '../store/workflowStore';
import { NodeType } from '@automflows/shared';

// Node icon colors mapping (matching CustomNode.tsx)
const nodeColors: Record<NodeType | string, string> = {
  [NodeType.START]: '#4CAF50',
  [NodeType.OPEN_BROWSER]: '#2196F3',
  [NodeType.TYPE]: '#FF9800',
  [NodeType.SCREENSHOT]: '#F44336',
  [NodeType.WAIT]: '#FFC107',
  [NodeType.JAVASCRIPT_CODE]: '#2196F3',
  [NodeType.LOOP]: '#9C27B0',
  [NodeType.INT_VALUE]: '#2196F3',
  [NodeType.STRING_VALUE]: '#4CAF50',
  [NodeType.BOOLEAN_VALUE]: '#4CAF50',
  [NodeType.INPUT_VALUE]: '#FF9800',
  [NodeType.VERIFY]: '#4CAF50',
  [NodeType.API_REQUEST]: '#2196F3',
  [NodeType.API_CURL]: '#9C27B0',
  [NodeType.LOAD_CONFIG_FILE]: '#FF9800',
  [NodeType.SELECT_CONFIG_FILE]: '#FF9800',
};

function getNodeColor(nodeType: string): string {
  return nodeColors[nodeType] || '#4a9eff';
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  target,
  style = {},
  markerEnd,
  animated = false,
}: EdgeProps) {
  const { onEdgesChange, nodes } = useWorkflowStore();
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Get source and target node types
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  const sourceNodeType = sourceNode?.data?.type || '';
  const targetNodeType = targetNode?.data?.type || '';
  
  // Get colors for gradient
  const sourceColor = getNodeColor(sourceNodeType);
  const targetColor = getNodeColor(targetNodeType);
  
  // Create unique gradient ID for this edge
  const gradientId = `edge-gradient-${id}`;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Remove this edge
    onEdgesChange([{ id, type: 'remove' }]);
  };

  return (
    <>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={sourceColor} />
          <stop offset="100%" stopColor={targetColor} />
        </linearGradient>
      </defs>
      {/* Gradient edge path */}
      <path
        d={edgePath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2}
        className={animated ? 'animated-edge' : ''}
        style={style}
        markerEnd={markerEnd}
      />
      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={35}
        style={{ cursor: 'pointer' }}
        onDoubleClick={handleDoubleClick}
      />
    </>
  );
}

