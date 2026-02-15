import { Node, Edge } from 'reactflow';
import { NodeType } from '@automflows/shared';
import { getDefaultNodeData } from '../store/workflowStore';

/**
 * Returns the default sample workflow template (Start → Open Browser → Navigation → Wait → Screenshot).
 * Shared between first-load (when no saved workflow), Reset button, and any other "load template" paths.
 */
export function getSampleTemplate(): { nodes: Node[]; edges: Edge[] } {
  const startX = 100;
  const y = 200;
  const spacing = 250;
  const baseTimestamp = Date.now();
  let nodeCounter = 0;

  const createNodeWithDefaults = (
    nodeType: NodeType,
    position: { x: number; y: number },
    label: string,
    overrides?: Record<string, unknown>
  ): Node => {
    const id = `${nodeType}-${baseTimestamp}-${nodeCounter++}`;
    const defaultData = getDefaultNodeData(nodeType);
    return {
      id,
      type: 'custom',
      position,
      data: {
        type: nodeType,
        label,
        ...defaultData,
        ...overrides,
      },
    };
  };

  const startNode = createNodeWithDefaults(NodeType.START, { x: startX, y }, 'Start');
  const startId = startNode.id;

  const openBrowserNode = createNodeWithDefaults(
    NodeType.OPEN_BROWSER,
    { x: startX + spacing, y },
    'Open Browser',
    { headless: false, viewportWidth: 1280, viewportHeight: 720 }
  );
  const openBrowserId = openBrowserNode.id;

  const navigateNode = createNodeWithDefaults(
    NodeType.NAVIGATION,
    { x: startX + spacing * 2, y },
    'Navigation',
    { action: 'navigate', url: 'https://example.com', timeout: 30000, waitUntil: 'networkidle' }
  );
  const navigateId = navigateNode.id;

  const waitNode = createNodeWithDefaults(
    NodeType.WAIT,
    { x: startX + spacing * 3, y },
    'Wait',
    { waitType: 'timeout', value: 2000 }
  );
  const waitId = waitNode.id;

  const screenshotNode = createNodeWithDefaults(
    NodeType.SCREENSHOT,
    { x: startX + spacing * 4, y },
    'Screenshot',
    { fullPage: false }
  );
  const screenshotId = screenshotNode.id;

  const nodes: Node[] = [startNode, openBrowserNode, navigateNode, waitNode, screenshotNode];

  const edges: Edge[] = [
    { id: `edge-${startId}-output-${openBrowserId}-input`, source: startId, target: openBrowserId, sourceHandle: 'output', targetHandle: 'input' },
    { id: `edge-${startId}-output-${openBrowserId}-driver`, source: startId, target: openBrowserId, sourceHandle: 'output', targetHandle: 'driver' },
    { id: `edge-${openBrowserId}-output-${navigateId}-input`, source: openBrowserId, target: navigateId, sourceHandle: 'output', targetHandle: 'input' },
    { id: `edge-${openBrowserId}-output-${navigateId}-driver`, source: openBrowserId, target: navigateId, sourceHandle: 'output', targetHandle: 'driver' },
    { id: `edge-${navigateId}-output-${waitId}-input`, source: navigateId, target: waitId, sourceHandle: 'output', targetHandle: 'input' },
    { id: `edge-${navigateId}-output-${waitId}-driver`, source: navigateId, target: waitId, sourceHandle: 'output', targetHandle: 'driver' },
    { id: `edge-${waitId}-output-${screenshotId}-input`, source: waitId, target: screenshotId, sourceHandle: 'output', targetHandle: 'input' },
    { id: `edge-${waitId}-output-${screenshotId}-driver`, source: waitId, target: screenshotId, sourceHandle: 'output', targetHandle: 'driver' },
  ];

  return { nodes, edges };
}
