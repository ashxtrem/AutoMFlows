import { Node } from 'reactflow';
import { OpenBrowserNodeData } from '@automflows/shared';

/**
 * Check if the workflow has any OpenBrowser node with headless mode enabled.
 * Headless mode is enabled by default (headless !== false means headless is true).
 */
export function hasHeadlessBrowser(nodes: Node[]): boolean {
  return nodes.some(node => {
    if (node.data.type === 'openBrowser') {
      const browserData = node.data as OpenBrowserNodeData;
      // headless defaults to true (headless !== false means it's headless)
      return browserData.headless !== false;
    }
    return false;
  });
}
