import * as fs from 'fs';
import * as path from 'path';
import { Workflow, NodeType } from '@automflows/shared';
import { WorkflowBuilder } from './workflowBuilder.js';
import { RequestAnalyzer } from './requestAnalyzer.js';
import { DOMSelectorInference } from './domSelectorInference.js';
import { buildNodeConfig, SelectorInfo } from './nodeFactory.js';
import { AccessibilityNode } from './types.js';
import { WAIT_AFTER_CLICK_MS } from '../config.js';

export type { AccessibilityNode };

interface SnapshotFile {
  nodeId: string;
  timing: 'pre' | 'post' | 'failure';
  timestamp: number;
  path: string;
}

/**
 * Load accessibility snapshots from a directory.
 * Snapshot naming: {nodeId}-{timing}-{timestamp}.json
 */
export function loadSnapshotsFromDir(snapshotsPath: string): Map<string, AccessibilityNode> {
  const resolvedPath = path.resolve(snapshotsPath);
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
    throw new Error(`Snapshots directory does not exist: ${resolvedPath}`);
  }

  const files = fs.readdirSync(resolvedPath);
  const snapshotFiles: SnapshotFile[] = [];

  // Parse filenames: nodeId-timing-timestamp.json (e.g. navigation-1771427967784-2-post-1771430712149.json)
  // Format from accessibilitySnapshots.ts: `${nodeId}-${timing}-${Date.now()}.json`
  const pattern = /^(.+)-(pre|post|failure)-(\d+)\.json$/;
  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const [, nodeIdPart, timing, timestampStr] = match;
      snapshotFiles.push({
        nodeId: nodeIdPart,
        timing: timing as 'pre' | 'post' | 'failure',
        timestamp: parseInt(timestampStr, 10),
        path: path.join(resolvedPath, file),
      });
    }
  }

  const result = new Map<string, AccessibilityNode>();

  // Get the latest post snapshot for "latest" page state (most recent post)
  const postSnapshots = snapshotFiles
    .filter((f) => f.timing === 'post')
    .sort((a, b) => b.timestamp - a.timestamp);

  if (postSnapshots.length > 0) {
    const latest = postSnapshots[0];
    try {
      const content = fs.readFileSync(latest.path, 'utf-8');
      const tree = JSON.parse(content) as AccessibilityNode;
      result.set('latest', tree);
    } catch (err: any) {
      console.warn(`Failed to load snapshot ${latest.path}: ${err.message}`);
    }
  }

  // Also key by nodeId for future use (e.g. per-node snapshot mapping)
  for (const sf of postSnapshots) {
    if (!result.has(sf.nodeId)) {
      try {
        const content = fs.readFileSync(sf.path, 'utf-8');
        const tree = JSON.parse(content) as AccessibilityNode;
        result.set(sf.nodeId, tree);
      } catch {
        // Skip
      }
    }
  }

  return result;
}

/**
 * Build a workflow from user request and accessibility snapshots.
 * Adds initial nodes (openBrowser, navigation, wait) then UI action nodes with getByRole locators.
 */
export function buildWorkflowFromSnapshots(
  userRequest: string,
  useCase: string,
  snapshotsPath: string
): Workflow {
  const snapshots = loadSnapshotsFromDir(snapshotsPath);
  const latestTree = snapshots.get('latest');
  if (!latestTree) {
    throw new Error(
      `No post snapshots found in ${snapshotsPath}. Run a workflow with snapshotAllNodes enabled first.`
    );
  }

  const builder = new WorkflowBuilder();
  const steps = RequestAnalyzer.parseSequentialSteps(userRequest);

  // Extract URL from request
  const urlMatch = userRequest.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : '';

  const hasBrowserActions = steps.some(
    (s) =>
      s.action === 'navigate' ||
      s.action === 'click' ||
      s.action === 'type' ||
      s.action === 'fill' ||
      s.action === 'submit'
  );

  let lastNodeId: string | undefined;

  if (hasBrowserActions) {
    // Add openBrowser
    const browserId = builder.addNode('openBrowser', {
      label: 'Open Browser',
      headless: false,
      browser: 'chromium',
      viewportWidth: 1280,
      viewportHeight: 720,
    });
    const startId = builder.getStartNodeId()!;
    builder.connectNodes(startId, browserId);
    lastNodeId = browserId;

    // Add navigation if URL found
    if (url) {
      const navId = builder.addNode('navigation', {
        label: `Navigate to ${url}`,
        action: 'navigate',
        url,
        waitUntil: 'networkidle',
      });
      builder.connectNodes(browserId, navId);

      const waitAfterNavId = builder.addNode('wait', {
        label: 'Wait after navigation',
        timeout: WAIT_AFTER_CLICK_MS,
      });
      builder.connectNodes(navId, waitAfterNavId);
      lastNodeId = waitAfterNavId;
    }
  }

  // Process steps - skip navigate if we already added it
  for (const step of steps) {
    if (step.action === 'navigate' && url && lastNodeId) {
      continue;
    }

    let currentNodeId: string | undefined;

    // Build SelectorInfo from snapshot for interaction steps
    let selectorInfo: SelectorInfo | null = null;
    if (step.action === 'click' || step.action === 'type' || step.action === 'fill' || step.action === 'submit') {
      const target = step.action === 'submit' ? 'submit' : (step.action === 'fill' ? (step.target || 'form') : step.target);
      const snapshotAction = (step.action === 'type' || step.action === 'fill') ? 'type' : 'click';
      const match = findElementInSnapshot(latestTree, snapshotAction, target);
      if (match) {
        selectorInfo = { selector: match.selector, selectorType: 'getByRole' };
      }
    }

    const nodeConfig = buildNodeConfig(step, selectorInfo);

    if (nodeConfig) {
      currentNodeId = builder.addNode(nodeConfig.type, nodeConfig.data);
    }

    if (currentNodeId && lastNodeId) {
      builder.connectNodes(lastNodeId, currentNodeId);
      if (step.action === 'navigate' || step.action === 'click') {
        const waitId = builder.addNode('wait', {
          label: `Wait after ${step.action}`,
          timeout: WAIT_AFTER_CLICK_MS,
        });
        builder.connectNodes(currentNodeId, waitId);
        lastNodeId = waitId;
      } else {
        lastNodeId = currentNodeId;
      }
    } else if (currentNodeId) {
      lastNodeId = currentNodeId;
    }
  }

  return builder.build();
}

/**
 * Find element in accessibility tree by action and target.
 * Returns getByRole selector format: role:button,name:Login
 */
export function findElementInSnapshot(
  tree: AccessibilityNode,
  action: string,
  target?: string
): { selector: string; selectorType: 'getByRole' } | null {
  const options = DOMSelectorInference.inferSelectorFromAccessibilityTree(tree, action, target);
  if (options.length > 0 && options[0].type === 'getByRole') {
    return {
      selector: options[0].selector,
      selectorType: 'getByRole',
    };
  }
  return null;
}

