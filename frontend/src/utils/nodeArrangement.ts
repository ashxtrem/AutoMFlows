import { Node, Edge } from 'reactflow';

interface ArrangementOptions {
  nodeSpacing?: number;
  startX?: number;
  startY?: number;
}

const DEFAULT_NODE_SPACING = 250;
const DEFAULT_START_X = 100;
const DEFAULT_START_Y = 200;

/**
 * Find the start node (node with no incoming edges)
 */
function findStartNode(nodes: Node[], edges: Edge[]): Node | null {
  const nodesWithIncomingEdges = new Set(edges.map((e) => e.target));
  return nodes.find((node) => !nodesWithIncomingEdges.has(node.id)) || null;
}

/**
 * Build a graph structure from nodes and edges
 */
function buildGraph(nodes: Node[], edges: Edge[]): Map<string, { node: Node; children: string[]; parents: string[] }> {
  const graph = new Map<string, { node: Node; children: string[]; parents: string[] }>();
  
  // Initialize graph
  nodes.forEach((node) => {
    graph.set(node.id, {
      node,
      children: [],
      parents: [],
    });
  });
  
  // Build connections
  edges.forEach((edge) => {
    const source = graph.get(edge.source);
    const target = graph.get(edge.target);
    if (source && target) {
      source.children.push(edge.target);
      target.parents.push(edge.source);
    }
  });
  
  return graph;
}

/**
 * Arrange nodes in a vertical stack (top to bottom)
 */
export function arrangeNodesVertical(
  nodes: Node[],
  edges: Edge[],
  options: ArrangementOptions = {}
): Node[] {
  const { nodeSpacing = DEFAULT_NODE_SPACING, startX = DEFAULT_START_X, startY = DEFAULT_START_Y } = options;
  
  if (nodes.length === 0) return nodes;
  
  const graph = buildGraph(nodes, edges);
  const arrangedNodes: Node[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  
  // Find start node or use first node
  const startNode = findStartNode(nodes, edges) || nodes[0];
  
  // BFS traversal to assign positions
  const queue: Array<{ nodeId: string; level: number; x: number }> = [
    { nodeId: startNode.id, level: 0, x: startX },
  ];
  
  const levelPositions = new Map<number, number[]>();
  
  while (queue.length > 0) {
    const { nodeId, level, x } = queue.shift()!;
    
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    
    // Track x positions per level for alignment
    if (!levelPositions.has(level)) {
      levelPositions.set(level, []);
    }
    levelPositions.get(level)!.push(x);
    
    // Calculate y position based on level
    const y = startY + level * nodeSpacing;
    
    arrangedNodes.push({
      ...node,
      position: { x, y },
    });
    
    // Process children
    const graphNode = graph.get(nodeId);
    if (graphNode) {
      graphNode.children.forEach((childId, index) => {
        if (!visited.has(childId)) {
          // Use same x position for children (vertical stack)
          queue.push({ nodeId: childId, level: level + 1, x });
        }
      });
    }
  }
  
  // Handle any unvisited nodes (disconnected components)
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      const maxLevel = Math.max(...Array.from(levelPositions.keys()), -1);
      arrangedNodes.push({
        ...node,
        position: { x: startX, y: startY + (maxLevel + 1) * nodeSpacing },
      });
    }
  });
  
  return arrangedNodes;
}

/**
 * Arrange nodes in a horizontal stack (left to right)
 */
export function arrangeNodesHorizontal(
  nodes: Node[],
  edges: Edge[],
  options: ArrangementOptions = {}
): Node[] {
  const { nodeSpacing = DEFAULT_NODE_SPACING, startX = DEFAULT_START_X, startY = DEFAULT_START_Y } = options;
  
  if (nodes.length === 0) return nodes;
  
  const graph = buildGraph(nodes, edges);
  const arrangedNodes: Node[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  
  // Find start node or use first node
  const startNode = findStartNode(nodes, edges) || nodes[0];
  
  // BFS traversal to assign positions
  const queue: Array<{ nodeId: string; level: number; y: number }> = [
    { nodeId: startNode.id, level: 0, y: startY },
  ];
  
  const levelPositions = new Map<number, number[]>();
  
  while (queue.length > 0) {
    const { nodeId, level, y } = queue.shift()!;
    
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    
    // Track y positions per level for alignment
    if (!levelPositions.has(level)) {
      levelPositions.set(level, []);
    }
    levelPositions.get(level)!.push(y);
    
    // Calculate x position based on level
    const x = startX + level * nodeSpacing;
    
    arrangedNodes.push({
      ...node,
      position: { x, y },
    });
    
    // Process children
    const graphNode = graph.get(nodeId);
    if (graphNode) {
      graphNode.children.forEach((childId) => {
        if (!visited.has(childId)) {
          // Use same y position for children (horizontal stack)
          queue.push({ nodeId: childId, level: level + 1, y });
        }
      });
    }
  }
  
  // Handle any unvisited nodes (disconnected components)
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      const maxLevel = Math.max(...Array.from(levelPositions.keys()), -1);
      arrangedNodes.push({
        ...node,
        position: { x: startX + (maxLevel + 1) * nodeSpacing, y: startY },
      });
    }
  });
  
  return arrangedNodes;
}
