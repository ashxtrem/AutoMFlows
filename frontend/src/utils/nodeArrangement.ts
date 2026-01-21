import { Node, Edge } from 'reactflow';

interface ArrangementOptions {
  nodeSpacing?: number;
  startX?: number;
  startY?: number;
  nodesPerRow?: number;
  nodesPerColumn?: number;
}

const DEFAULT_NODE_SPACING = 250;
const DEFAULT_START_X = 100;
const DEFAULT_START_Y = 200;

/**
 * Arrange nodes in a vertical stack (top to bottom) in a grid pattern
 * Nodes are arranged sequentially, filling columns top-to-bottom, then moving to the next column
 */
export function arrangeNodesVertical(
  nodes: Node[],
  _edges: Edge[],
  options: ArrangementOptions = {}
): Node[] {
  const { 
    nodeSpacing = DEFAULT_NODE_SPACING, 
    startX = DEFAULT_START_X, 
    startY = DEFAULT_START_Y,
    nodesPerColumn = 10
  } = options;
  
  if (nodes.length === 0) return nodes;
  
  const arrangedNodes: Node[] = [];
  
  // Arrange nodes sequentially in a grid pattern
  // For vertical: fill column top-to-bottom, then move to next column
  nodes.forEach((node, index) => {
    const columnIndex = Math.floor(index / nodesPerColumn);
    const rowIndex = index % nodesPerColumn;
    
    const x = startX + columnIndex * nodeSpacing;
    const y = startY + rowIndex * nodeSpacing;
    
    arrangedNodes.push({
      ...node,
      position: { x, y },
    });
  });
  
  return arrangedNodes;
}

/**
 * Arrange nodes in a horizontal stack (left to right) in a grid pattern
 * Nodes are arranged sequentially, filling rows left-to-right, then moving to the next row
 */
export function arrangeNodesHorizontal(
  nodes: Node[],
  _edges: Edge[],
  options: ArrangementOptions = {}
): Node[] {
  const { 
    nodeSpacing = DEFAULT_NODE_SPACING, 
    startX = DEFAULT_START_X, 
    startY = DEFAULT_START_Y,
    nodesPerRow = 10
  } = options;
  
  if (nodes.length === 0) return nodes;
  
  const arrangedNodes: Node[] = [];
  
  // Arrange nodes sequentially in a grid pattern
  // For horizontal: fill row left-to-right, then move to next row
  nodes.forEach((node, index) => {
    const rowIndex = Math.floor(index / nodesPerRow);
    const columnIndex = index % nodesPerRow;
    
    const x = startX + columnIndex * nodeSpacing;
    const y = startY + rowIndex * nodeSpacing;
    
    arrangedNodes.push({
      ...node,
      position: { x, y },
    });
  });
  
  return arrangedNodes;
}
