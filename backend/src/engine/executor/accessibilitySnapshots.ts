import * as fs from 'fs';
import * as path from 'path';
import { ContextManager } from '../context';
import { ExecutionTracker } from '../../utils/executionTracker';

export interface AccessibilityNode {
  role?: string;
  name?: string;
  value?: string;
  level?: number;
  children?: AccessibilityNode[];
}

/**
 * Build accessibility tree from CDP getFullAXTree nodes
 */
function buildTreeFromCDPNodes(nodes: any[]): AccessibilityNode | null {
  if (!nodes || nodes.length === 0) return null;

  const nodeMap = new Map<string, any>();
  for (const node of nodes) {
    nodeMap.set(node.nodeId, { ...node });
  }

  // Find root (node with no parentId or parent not in tree)
  let rootNode: any = null;
  for (const node of nodes) {
    if (!node.parentId || !nodeMap.has(node.parentId)) {
      rootNode = node;
      break;
    }
  }
  if (!rootNode) rootNode = nodes[0];

  function buildNode(cdpNode: any): AccessibilityNode {
    const result: AccessibilityNode = {};
    if (cdpNode.role?.value) result.role = String(cdpNode.role.value);
    if (cdpNode.name?.value) result.name = String(cdpNode.name.value);
    if (cdpNode.value?.value !== undefined) result.value = String(cdpNode.value.value);

    // Extract level from properties (for headings)
    const levelProp = cdpNode.properties?.find((p: any) => p.name === 'level');
    if (levelProp?.value?.value !== undefined) {
      result.level = Number(levelProp.value.value);
    }

    const childIds = cdpNode.childIds || [];
    if (childIds.length > 0) {
      result.children = childIds
        .map((id: string) => nodeMap.get(id))
        .filter(Boolean)
        .map((child: any) => buildNode(child));
    }
    return result;
  }

  return buildNode(rootNode);
}

/**
 * Fallback: build tree from DOM via page.evaluate (for Firefox/WebKit)
 * Extracts interactive elements with role, name, value into a flat list under WebArea
 */
async function buildTreeFromDOM(page: any): Promise<AccessibilityNode | null> {
  return page.evaluate(() => {
    const IMPLICIT_ROLES: Record<string, string> = {
      a: 'link',
      button: 'button',
      input: 'textbox',
      textarea: 'textbox',
      select: 'combobox',
      h1: 'heading',
      h2: 'heading',
      h3: 'heading',
      h4: 'heading',
      h5: 'heading',
      h6: 'heading',
      img: 'img',
      nav: 'navigation',
      main: 'main',
      header: 'banner',
      footer: 'contentinfo',
      article: 'article',
      form: 'form',
    };

    function getRole(el: Element): string {
      const role = el.getAttribute('role');
      if (role) return role.toLowerCase();
      const tag = el.tagName.toLowerCase();
      return IMPLICIT_ROLES[tag] || 'generic';
    }

    function getName(el: Element): string {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;
      const title = el.getAttribute('title');
      if (title) return title;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        const id = (el as HTMLInputElement).id;
        if (id) {
          const label = document.querySelector('label[for="' + id + '"]');
          if (label) return label.textContent?.trim() || '';
        }
      }
      if (['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        return el.textContent?.trim()?.substring(0, 100) || '';
      }
      return '';
    }

    function getValue(el: Element): string | undefined {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return el.value || undefined;
      }
      return undefined;
    }

    function getLevel(el: Element): number | undefined {
      const tag = el.tagName.toLowerCase();
      const match = tag.match(/^h([1-6])$/);
      return match ? parseInt(match[1], 10) : undefined;
    }

    const selector = 'a, button, input, textarea, select, [role], h1, h2, h3, h4, h5, h6, nav, main, header, footer, article';
    const elements = document.querySelectorAll(selector);
    const children: any[] = [];
    for (const el of elements) {
      const result: any = { role: getRole(el) };
      const name = getName(el);
      if (name) result.name = name;
      const value = getValue(el);
      if (value !== undefined) result.value = value;
      const level = getLevel(el);
      if (level !== undefined) result.level = level;
      children.push(result);
    }
    return { role: 'WebArea', name: document.title || '', children };
  });
}

/**
 * Take an accessibility snapshot for a node at a specific timing
 */
export async function takeNodeAccessibilitySnapshot(
  nodeId: string,
  timing: 'pre' | 'post' | 'failure',
  context: ContextManager,
  executionTracker?: ExecutionTracker
): Promise<void> {
  try {
    const page = context.getPage();
    if (!page) return;
    if (page.isClosed && page.isClosed()) return;

    const snapshotsDir = executionTracker?.getSnapshotsDirectory?.();
    if (!snapshotsDir) return;

    let tree: AccessibilityNode | null = null;

    // Try CDP first (Chromium)
    try {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Accessibility.enable');
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      await cdp.detach();
      tree = buildTreeFromCDPNodes(nodes || []);
    } catch {
      // Fallback to DOM-based extraction (Firefox/WebKit or CDP failure)
      tree = await buildTreeFromDOM(page);
    }

    if (!tree) return;

    const fileName = `${nodeId}-${timing}-${Date.now()}.json`;
    const snapshotPath = path.join(snapshotsDir, fileName);
    fs.writeFileSync(snapshotPath, JSON.stringify(tree, null, 2), 'utf-8');

    if (executionTracker) {
      executionTracker.recordAccessibilitySnapshot(nodeId, snapshotPath, timing);
    }
  } catch (error: any) {
    console.warn(`Failed to take ${timing} accessibility snapshot for node ${nodeId}: ${error.message}`);
  }
}
