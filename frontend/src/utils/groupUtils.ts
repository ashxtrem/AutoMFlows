import { Node } from 'reactflow';

const DEFAULT_PADDING = 5;
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 100;

/**
 * Get actual rendered node dimensions from DOM
 * Falls back to stored dimensions if DOM element not found
 */
function getActualNodeDimensions(node: Node): { width: number; height: number } {
  // Try to get actual DOM dimensions first
  const nodeElement = document.querySelector(`[data-id="${node.id}"]`) as HTMLElement;
  if (nodeElement) {
    const rect = nodeElement.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
  
  // Fallback to stored dimensions
  const width = node.width || node.data?.width || DEFAULT_NODE_WIDTH;
  const height = node.height || node.data?.height || DEFAULT_NODE_HEIGHT;
  return { width, height };
}

/**
 * Get node dimensions with defaults
 */
function getNodeDimensions(node: Node): { width: number; height: number } {
  return getActualNodeDimensions(node);
}

/**
 * Calculate bounding box for a group of nodes with padding
 */
export function calculateGroupBounds(
  nodes: Node[],
  padding: number = DEFAULT_PADDING
): { x: number; y: number; width: number; height: number } | null {
  if (nodes.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const dim = getNodeDimensions(node);
    const nodeLeft = node.position.x;
    const nodeTop = node.position.y;
    const nodeRight = nodeLeft + dim.width;
    const nodeBottom = nodeTop + dim.height;

    minX = Math.min(minX, nodeLeft);
    minY = Math.min(minY, nodeTop);
    maxX = Math.max(maxX, nodeRight);
    maxY = Math.max(maxY, nodeBottom);
  });

  const result = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
  return result;
}
