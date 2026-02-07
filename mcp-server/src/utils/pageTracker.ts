import { Workflow, BaseNode } from '@automflows/shared';

export class PageTracker {
  /**
   * Track which nodes execute on which pages
   * For navigation nodes: extract URL from node data
   * For other nodes: infer from previous navigation nodes
   */
  static async getPageUrlForNode(
    workflow: Workflow,
    nodeId: string,
    executionContext?: any
  ): Promise<string | null> {
    // If execution context provides page URL, use it
    if (executionContext?.pageUrl) {
      return executionContext.pageUrl;
    }

    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      return null;
    }

    // For navigation nodes, extract URL from node data
    if (node.type === 'navigate') {
      const url = (node.data as any)?.url;
      if (url) {
        return url;
      }
    }

    // For other nodes, find the most recent navigation node before this node
    const pageUrl = this.findPageUrlFromNavigationNodes(workflow, nodeId);
    return pageUrl;
  }

  /**
   * Find page URL by traversing backwards from target node to find navigation nodes
   */
  private static findPageUrlFromNavigationNodes(
    workflow: Workflow,
    targetNodeId: string
  ): string | null {
    // Build execution order (simplified - assumes linear flow)
    const executionOrder = this.getExecutionOrder(workflow);
    const targetIndex = executionOrder.findIndex(id => id === targetNodeId);
    
    if (targetIndex === -1) {
      return null;
    }

    // Traverse backwards to find last navigation node
    for (let i = targetIndex - 1; i >= 0; i--) {
      const nodeId = executionOrder[i];
      const node = workflow.nodes.find(n => n.id === nodeId);
      
      if (node?.type === 'navigate') {
        const url = (node.data as any)?.url;
        if (url) {
          return url;
        }
      }
    }

    return null;
  }

  /**
   * Get execution order by traversing workflow graph
   */
  private static getExecutionOrder(workflow: Workflow): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    
    // Find start node
    const startNode = workflow.nodes.find(n => n.type === 'start');
    if (!startNode) {
      return order;
    }

    // BFS traversal
    const queue: string[] = [startNode.id];
    visited.add(startNode.id);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      order.push(nodeId);

      // Find outgoing edges
      const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    return order;
  }

  /**
   * Find all nodes that execute on the same page
   * Consider navigation nodes and their successors until next navigation
   */
  static findNodesOnSamePage(
    workflow: Workflow,
    targetPageUrl: string
  ): string[] {
    const nodesOnPage: string[] = [];
    const executionOrder = this.getExecutionOrder(workflow);
    
    let currentPageUrl: string | null = null;
    let collectingNodes = false;

    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Check if this is a navigation node
      if (node.type === 'navigate') {
        const url = (node.data as any)?.url;
        if (url === targetPageUrl) {
          // Start collecting nodes for this page
          currentPageUrl = url;
          collectingNodes = true;
          nodesOnPage.push(nodeId);
        } else if (collectingNodes && url !== targetPageUrl) {
          // New navigation to different page - stop collecting
          break;
        }
      } else if (collectingNodes && currentPageUrl === targetPageUrl) {
        // Collect nodes that execute on this page
        // Skip wait nodes and other utility nodes that don't interact with page
        if (this.isPageInteractionNode(node)) {
          nodesOnPage.push(nodeId);
        }
      }
    }

    return nodesOnPage;
  }

  /**
   * Check if node interacts with the page (needs selector)
   */
  private static isPageInteractionNode(node: BaseNode): boolean {
    const interactionTypes = [
      'click',
      'type',
      'select',
      'hover',
      'scroll',
      'verify',
      'screenshot',
      'extract',
    ];
    
    return interactionTypes.includes(node.type);
  }

  /**
   * Normalize URL for comparison (remove trailing slashes, query params, etc.)
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Compare by origin + pathname (ignore query params and hash for page matching)
      return `${urlObj.origin}${urlObj.pathname}`.replace(/\/$/, '');
    } catch {
      // If URL parsing fails, return as-is
      return url.replace(/\/$/, '');
    }
  }

  /**
   * Check if two URLs are on the same page (ignoring query params)
   */
  static areUrlsOnSamePage(url1: string, url2: string): boolean {
    return this.normalizeUrl(url1) === this.normalizeUrl(url2);
  }
}
