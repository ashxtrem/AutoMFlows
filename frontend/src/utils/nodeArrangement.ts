import { Node, Edge } from 'reactflow';
import { NodeType } from '@automflows/shared';

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
const MIN_NODE_GAP = 5; // Minimum gap between nodes in pixels
const DEFAULT_NODE_WIDTH = 200; // Default node width if not specified
const DEFAULT_NODE_HEIGHT = 100; // Default node height if not specified

// Helper Functions

/**
 * Get node dimensions with defaults
 */
function getNodeDimensions(node: Node): { width: number; height: number } {
  const width = node.width || node.data?.width || DEFAULT_NODE_WIDTH;
  const height = node.height || node.data?.height || DEFAULT_NODE_HEIGHT;
  return { width, height };
}

/**
 * Calculate minimum spacing between two nodes to ensure at least MIN_NODE_GAP gap
 */
// @ts-ignore - Function may be used in future
function calculateMinSpacing(node1: Node, node2: Node, direction: 'horizontal' | 'vertical'): number {
  const dim1 = getNodeDimensions(node1);
  const dim2 = getNodeDimensions(node2);
  
  if (direction === 'horizontal') {
    // For horizontal: need width/2 of node1 + gap + width/2 of node2
    return (dim1.width / 2) + MIN_NODE_GAP + (dim2.width / 2);
  } else {
    // For vertical: need height/2 of node1 + gap + height/2 of node2
    return (dim1.height / 2) + MIN_NODE_GAP + (dim2.height / 2);
  }
}

/**
 * Calculate safe spacing for a group of nodes arranged in a line
 */
function calculateSafeSpacing(nodes: Node[], direction: 'horizontal' | 'vertical', minSpacing: number): number {
  if (nodes.length <= 1) return minSpacing;
  
  // Find the maximum dimension needed
  let maxDimension = 0;
  nodes.forEach(node => {
    const dim = getNodeDimensions(node);
    const dimension = direction === 'horizontal' ? dim.width : dim.height;
    maxDimension = Math.max(maxDimension, dimension);
  });
  
  // Return the larger of: minSpacing or maxDimension + MIN_NODE_GAP
  return Math.max(minSpacing, maxDimension + MIN_NODE_GAP);
}

/**
 * Find the start node in the nodes array
 */
function findStartNode(nodes: Node[]): Node | null {
  return nodes.find(node => node.data?.type === NodeType.START || node.data?.type === 'start') || null;
}

/**
 * Check if a node is a reusable node
 */
function isReusableNode(node: Node): boolean {
  return node.data?.type === 'reusable.reusable';
}

/**
 * Check if an edge is a property input connection
 * Property input handles end with '-input' but exclude the generic 'input' handle
 */
function isPropertyInputConnection(edge: Edge): boolean {
  if (!edge.targetHandle) return false;
  return edge.targetHandle.endsWith('-input') && edge.targetHandle !== 'input';
}

/**
 * Check if an edge is a driver connection (main flow connection)
 * Driver connections have targetHandle === 'driver' or 'input' or undefined/null
 */
function isDriverConnection(edge: Edge): boolean {
  if (!edge.targetHandle) return true; // No handle means driver connection
  return edge.targetHandle === 'driver' || edge.targetHandle === 'input';
}

/**
 * Get outgoing driver connections from a node
 */
function getDriverConnections(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter(edge => edge.source === nodeId && isDriverConnection(edge));
}

/**
 * Get all connected node IDs via BFS following driver connections only
 */
function getConnectedNodeIds(startNodeId: string, _nodes: Node[], edges: Edge[]): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    const driverEdges = getDriverConnections(currentNodeId, edges);
    
    for (const edge of driverEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return visited;
}

/**
 * Get connection sequence from start node following driver connections
 * Returns nodes in BFS order
 */
function getConnectionSequence(startNodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const nodeMap = new Map<string, Node>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  const visited = new Set<string>();
  const sequence: Node[] = [];
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);

  const startNode = nodeMap.get(startNodeId);
  if (startNode) {
    sequence.push(startNode);
  }

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    const driverEdges = getDriverConnections(currentNodeId, edges);
    
    for (const edge of driverEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        const targetNode = nodeMap.get(edge.target);
        if (targetNode) {
          sequence.push(targetNode);
          queue.push(edge.target);
        }
      }
    }
  }

  return sequence;
}

/**
 * Get property input nodes mapped to their target nodes
 * Returns a map: targetNodeId -> [sourceNode1, sourceNode2, ...]
 */
function getPropertyInputNodes(nodes: Node[], edges: Edge[]): Map<string, Node[]> {
  const nodeMap = new Map<string, Node>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  const propertyInputMap = new Map<string, Node[]>();

  for (const edge of edges) {
    if (isPropertyInputConnection(edge)) {
      const sourceNode = nodeMap.get(edge.source);
      if (sourceNode) {
        const existing = propertyInputMap.get(edge.target) || [];
        existing.push(sourceNode);
        propertyInputMap.set(edge.target, existing);
      }
    }
  }

  return propertyInputMap;
}

/**
 * Categorize nodes into connected, reusable, unconnected, and property inputs
 */
function categorizeNodes(
  nodes: Node[],
  edges: Edge[],
  startNodeId: string | null
): {
  connected: Node[];
  reusable: Node[];
  unconnected: Node[];
  propertyInputs: Map<string, Node[]>;
} {
  const propertyInputs = getPropertyInputNodes(nodes, edges);
  const propertyInputNodeIds = new Set<string>();
  propertyInputs.forEach(inputNodes => {
    inputNodes.forEach(node => propertyInputNodeIds.add(node.id));
  });

  if (!startNodeId) {
    // No start node - all nodes are unconnected except reusables
    const reusable: Node[] = [];
    const unconnected: Node[] = [];
    
    nodes.forEach(node => {
      if (isReusableNode(node)) {
        reusable.push(node);
      } else {
        unconnected.push(node);
      }
    });

    return { connected: [], reusable, unconnected, propertyInputs };
  }

  const connectedIds = getConnectedNodeIds(startNodeId, nodes, edges);
  const connected: Node[] = [];
  const reusable: Node[] = [];
  const unconnected: Node[] = [];

  nodes.forEach(node => {
    if (isReusableNode(node)) {
      reusable.push(node);
    } else if (connectedIds.has(node.id)) {
      connected.push(node);
    } else if (!propertyInputNodeIds.has(node.id)) {
      // Only add to unconnected if it's not a property input node
      unconnected.push(node);
    }
  });

  return { connected, reusable, unconnected, propertyInputs };
}

/**
 * Arrange nodes in a vertical stack (top to bottom) in a grid pattern
 * Follows connection sequence from start node, positions reusable nodes left, 
 * and property input nodes above their targets
 */
export function arrangeNodesVertical(
  nodes: Node[],
  edges: Edge[],
  options: ArrangementOptions = {}
): Node[] {
  const { 
    nodeSpacing = DEFAULT_NODE_SPACING, 
    startX = DEFAULT_START_X, 
    startY = DEFAULT_START_Y,
    nodesPerColumn = 10
  } = options;
  
  if (nodes.length === 0) return nodes;

  const startNode = findStartNode(nodes);
  const startNodeId = startNode?.id || null;

  // Categorize nodes
  const { connected: _connected, reusable, unconnected, propertyInputs } = categorizeNodes(nodes, edges, startNodeId);

  // Get connection sequence for connected nodes
  const connectionSequence = startNodeId 
    ? getConnectionSequence(startNodeId, nodes, edges)
    : [];

  // Create a map of all nodes for quick lookup
  const nodeMap = new Map<string, Node>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  // Track which nodes have been positioned
  const positionedNodes = new Set<string>();
  const arrangedNodes: Node[] = [];
  
  // Calculate safe horizontal and vertical spacing
  const safeHorizontalSpacing = calculateSafeSpacing(connectionSequence, 'horizontal', nodeSpacing);
  const safeVerticalSpacing = calculateSafeSpacing(connectionSequence, 'vertical', nodeSpacing);

  // Arrange connected nodes in sequence (left to right, top to bottom grid)
  connectionSequence.forEach((node, index) => {
    if (positionedNodes.has(node.id)) return;

    const columnIndex = Math.floor(index / nodesPerColumn);
    const rowIndex = index % nodesPerColumn;
    
    const x = startX + columnIndex * safeHorizontalSpacing;
    const y = startY + rowIndex * safeVerticalSpacing;
    
    arrangedNodes.push({
      ...node,
      position: { x, y },
    });
    positionedNodes.add(node.id);

    // Position property input nodes above this node
    const inputNodes = propertyInputs.get(node.id) || [];
    // Filter out input nodes that are already in the driver sequence
    const inputNodesToPosition = inputNodes.filter(inputNode => !connectionSequence.find(n => n.id === inputNode.id));
    
    if (inputNodesToPosition.length > 0) {
      // Calculate safe spacing for input nodes
      const inputHorizontalSpacing = calculateSafeSpacing(inputNodesToPosition, 'horizontal', nodeSpacing * 0.8);
      const targetNodeDim = getNodeDimensions(node);
      
      // Calculate vertical spacing needed to place inputs above target
      let maxInputHeight = 0;
      inputNodesToPosition.forEach(inputNode => {
        const inputDim = getNodeDimensions(inputNode);
        maxInputHeight = Math.max(maxInputHeight, inputDim.height);
      });
      const verticalSpacing = (targetNodeDim.height / 2) + MIN_NODE_GAP + (maxInputHeight / 2);
      
      // Arrange input nodes horizontally above the target node
      const totalInputWidth = inputNodesToPosition.length > 1 
        ? (inputNodesToPosition.length - 1) * inputHorizontalSpacing
        : 0;
      const startInputX = x - totalInputWidth / 2;
      
      inputNodesToPosition.forEach((inputNode, inputIndex) => {
        if (!positionedNodes.has(inputNode.id)) {
          const inputX = startInputX + inputIndex * inputHorizontalSpacing;
          const inputY = y - verticalSpacing; // Above the target node with proper spacing
          
          arrangedNodes.push({
            ...inputNode,
            position: { x: inputX, y: inputY },
          });
          positionedNodes.add(inputNode.id);
        }
      });
    }
  });

  // Arrange reusable nodes left of start node line (vertical stack)
  const reusableVerticalSpacing = reusable.length > 0 
    ? calculateSafeSpacing(reusable, 'vertical', safeVerticalSpacing)
    : safeVerticalSpacing;
  
  // Calculate horizontal offset to place reusable nodes left of start
  let maxReusableWidth = 0;
  reusable.forEach(node => {
    const dim = getNodeDimensions(node);
    maxReusableWidth = Math.max(maxReusableWidth, dim.width);
  });
  const reusableX = startX - maxReusableWidth / 2 - safeHorizontalSpacing - MIN_NODE_GAP;
  
  reusable.forEach((node, index) => {
    if (!positionedNodes.has(node.id)) {
      arrangedNodes.push({
        ...node,
        position: { x: reusableX, y: startY + index * reusableVerticalSpacing },
      });
      positionedNodes.add(node.id);
    }
  });

  // Arrange unconnected nodes left of reusable nodes (if reusables exist) or left of start node line
  const unconnectedVerticalSpacing = unconnected.length > 0
    ? calculateSafeSpacing(unconnected, 'vertical', safeVerticalSpacing)
    : safeVerticalSpacing;
  
  let maxUnconnectedWidth = 0;
  unconnected.forEach(node => {
    const dim = getNodeDimensions(node);
    maxUnconnectedWidth = Math.max(maxUnconnectedWidth, dim.width);
  });
  
  const unconnectedX = reusable.length > 0 
    ? reusableX - maxUnconnectedWidth / 2 - safeHorizontalSpacing - MIN_NODE_GAP
    : startX - maxUnconnectedWidth / 2 - safeHorizontalSpacing - MIN_NODE_GAP;
  
  unconnected.forEach((node, index) => {
    if (!positionedNodes.has(node.id)) {
      arrangedNodes.push({
        ...node,
        position: { x: unconnectedX, y: startY + index * unconnectedVerticalSpacing },
      });
      positionedNodes.add(node.id);
    }
  });

  // Preserve positions of any remaining nodes that weren't categorized
  nodes.forEach(node => {
    if (!positionedNodes.has(node.id)) {
      arrangedNodes.push(node);
    }
  });

  return arrangedNodes;
}

/**
 * Arrange nodes in a horizontal stack (left to right) in a grid pattern
 * Follows connection sequence from start node, positions reusable nodes above,
 * and property input nodes above their targets
 */
export function arrangeNodesHorizontal(
  nodes: Node[],
  edges: Edge[],
  options: ArrangementOptions = {}
): Node[] {
  const { 
    nodeSpacing = DEFAULT_NODE_SPACING, 
    startX = DEFAULT_START_X, 
    startY = DEFAULT_START_Y,
    nodesPerRow = 10
  } = options;
  
  if (nodes.length === 0) return nodes;

  const startNode = findStartNode(nodes);
  const startNodeId = startNode?.id || null;

  // Categorize nodes
  const { connected: _connected, reusable, unconnected, propertyInputs } = categorizeNodes(nodes, edges, startNodeId);

  // Get connection sequence for connected nodes
  const connectionSequence = startNodeId 
    ? getConnectionSequence(startNodeId, nodes, edges)
    : [];

  // Create a map of all nodes for quick lookup
  const nodeMap = new Map<string, Node>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  // Track which nodes have been positioned
  const positionedNodes = new Set<string>();
  const arrangedNodes: Node[] = [];
  
  // Calculate safe horizontal and vertical spacing
  const safeHorizontalSpacing = calculateSafeSpacing(connectionSequence, 'horizontal', nodeSpacing);
  const safeVerticalSpacing = calculateSafeSpacing(connectionSequence, 'vertical', nodeSpacing);

  // Arrange connected nodes in sequence (left to right, top to bottom grid)
  connectionSequence.forEach((node, index) => {
    if (positionedNodes.has(node.id)) return;

    const rowIndex = Math.floor(index / nodesPerRow);
    const columnIndex = index % nodesPerRow;
    
    const x = startX + columnIndex * safeHorizontalSpacing;
    const y = startY + rowIndex * safeVerticalSpacing;
    
    arrangedNodes.push({
      ...node,
      position: { x, y },
    });
    positionedNodes.add(node.id);

    // Position property input nodes above this node
    const inputNodes = propertyInputs.get(node.id) || [];
    // Filter out input nodes that are already in the driver sequence
    const inputNodesToPosition = inputNodes.filter(inputNode => !connectionSequence.find(n => n.id === inputNode.id));
    
    if (inputNodesToPosition.length > 0) {
      // Calculate safe spacing for input nodes
      const inputHorizontalSpacing = calculateSafeSpacing(inputNodesToPosition, 'horizontal', nodeSpacing * 0.8);
      const targetNodeDim = getNodeDimensions(node);
      
      // Calculate vertical spacing needed to place inputs above target
      let maxInputHeight = 0;
      inputNodesToPosition.forEach(inputNode => {
        const inputDim = getNodeDimensions(inputNode);
        maxInputHeight = Math.max(maxInputHeight, inputDim.height);
      });
      const verticalSpacing = (targetNodeDim.height / 2) + MIN_NODE_GAP + (maxInputHeight / 2);
      
      // Arrange input nodes horizontally above the target node
      const totalInputWidth = inputNodesToPosition.length > 1 
        ? (inputNodesToPosition.length - 1) * inputHorizontalSpacing
        : 0;
      const startInputX = x - totalInputWidth / 2;
      
      inputNodesToPosition.forEach((inputNode, inputIndex) => {
        if (!positionedNodes.has(inputNode.id)) {
          const inputX = startInputX + inputIndex * inputHorizontalSpacing;
          const inputY = y - verticalSpacing; // Above the target node with proper spacing
          
          arrangedNodes.push({
            ...inputNode,
            position: { x: inputX, y: inputY },
          });
          positionedNodes.add(inputNode.id);
        }
      });
    }
  });

  // Arrange reusable nodes above start node line (horizontal stack)
  const reusableHorizontalSpacing = reusable.length > 0
    ? calculateSafeSpacing(reusable, 'horizontal', safeHorizontalSpacing)
    : safeHorizontalSpacing;
  
  // Calculate vertical offset to place reusable nodes above start
  let maxReusableHeight = 0;
  reusable.forEach(node => {
    const dim = getNodeDimensions(node);
    maxReusableHeight = Math.max(maxReusableHeight, dim.height);
  });
  const reusableY = startY - maxReusableHeight / 2 - safeVerticalSpacing - MIN_NODE_GAP;
  
  reusable.forEach((node, index) => {
    if (!positionedNodes.has(node.id)) {
      arrangedNodes.push({
        ...node,
        position: { x: startX + index * reusableHorizontalSpacing, y: reusableY },
      });
      positionedNodes.add(node.id);
    }
  });

  // Arrange unconnected nodes above reusable nodes (if reusables exist) or above start node line
  const unconnectedHorizontalSpacing = unconnected.length > 0
    ? calculateSafeSpacing(unconnected, 'horizontal', safeHorizontalSpacing)
    : safeHorizontalSpacing;
  
  let maxUnconnectedHeight = 0;
  unconnected.forEach(node => {
    const dim = getNodeDimensions(node);
    maxUnconnectedHeight = Math.max(maxUnconnectedHeight, dim.height);
  });
  
  const unconnectedY = reusable.length > 0 
    ? reusableY - maxUnconnectedHeight / 2 - safeVerticalSpacing - MIN_NODE_GAP
    : startY - maxUnconnectedHeight / 2 - safeVerticalSpacing - MIN_NODE_GAP;
  
  unconnected.forEach((node, index) => {
    if (!positionedNodes.has(node.id)) {
      arrangedNodes.push({
        ...node,
        position: { x: startX + index * unconnectedHorizontalSpacing, y: unconnectedY },
      });
      positionedNodes.add(node.id);
    }
  });

  // Preserve positions of any remaining nodes that weren't categorized
  nodes.forEach(node => {
    if (!positionedNodes.has(node.id)) {
      arrangedNodes.push(node);
    }
  });

  return arrangedNodes;
}
