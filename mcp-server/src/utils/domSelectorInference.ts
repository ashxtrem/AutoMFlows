import { Workflow, SelectorOption } from '@automflows/shared';
import { WorkflowModifier } from './workflowModifier.js';

// PageDebugInfo interface (matches backend definition)
export interface PageDebugInfo {
  pageUrl?: string;
  pageSource?: string;
  similarSelectors?: Array<{
    selector: string;
    selectorType: 'css' | 'xpath';
    reason: string;
    elementInfo?: string;
  }>;
  screenshotPaths?: {
    pre?: string;
    post?: string;
  };
  accessibilityTree?: {
    role?: string;
    name?: string;
    value?: string;
    level?: number;
    children?: Array<{
      role?: string;
      name?: string;
      value?: string;
      level?: number;
      children?: any[];
    }>;
  };
  executionFolderName?: string;
}

export interface OptimizedDOMContext {
  pageUrl: string;
  relevantElements: Array<{
    tag: string;
    id?: string;
    classes?: string[];
    attributes: Record<string, string>;
    text?: string;
    role?: string;
  }>;
  similarSelectors?: Array<{
    selector: string;
    selectorType: 'css' | 'xpath';
    reason: string;
  }>;
  action?: string;
}

export class DOMSelectorInference {
  /**
   * Rule-based inference (0 tokens)
   * Parse action intent and search DOM for matching elements
   */
  static inferSelectorRuleBased(
    action: string,
    domContext: OptimizedDOMContext,
    nodeType: string
  ): SelectorOption[] {
    const selectors: SelectorOption[] = [];

    // Parse action to extract intent
    const actionLower = action.toLowerCase();
    const keywords = this.extractKeywords(actionLower);

    // Search DOM for matching elements
    for (const element of domContext.relevantElements || []) {
      const matches = this.elementMatchesIntent(element, keywords, nodeType);
      if (matches.score > 0) {
        const selector = this.generateSelectorForElement(element, nodeType);
        if (selector) {
          selectors.push({
            selector: selector.selector,
            type: selector.type,
            quality: matches.score > 0.7 ? 'high' : matches.score > 0.4 ? 'medium' : 'low',
            reason: matches.reason,
          });
        }
      }
    }

    // Also use similar selectors from PageDebugHelper if available
    if (domContext.similarSelectors) {
      for (const similar of domContext.similarSelectors) {
        selectors.push({
          selector: similar.selector,
          type: similar.selectorType,
          quality: 'medium',
          reason: similar.reason || 'Similar selector found',
        });
      }
    }

    // Sort by quality and return top 5
    return selectors
      .sort((a, b) => {
        const qualityOrder = { high: 3, medium: 2, low: 1 };
        return qualityOrder[b.quality] - qualityOrder[a.quality];
      })
      .slice(0, 5);
  }

  /**
   * Extract keywords from action description
   */
  private static extractKeywords(action: string): string[] {
    // Remove common words
    const stopWords = ['click', 'type', 'select', 'fill', 'enter', 'the', 'a', 'an', 'on', 'in', 'at', 'to', 'for'];
    const words = action.split(/\s+/).filter(w => w.length > 2);
    return words.filter(w => !stopWords.includes(w.toLowerCase()));
  }

  /**
   * Check if element matches action intent
   */
  private static elementMatchesIntent(
    element: any,
    keywords: string[],
    nodeType: string
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Check tag match
    if (nodeType === 'click' && ['button', 'a', 'input'].includes(element.tag)) {
      score += 0.3;
      reasons.push('Correct tag for click');
    }
    if (nodeType === 'type' && ['input', 'textarea'].includes(element.tag)) {
      score += 0.3;
      reasons.push('Correct tag for type');
    }

    // Check ID match
    if (element.id) {
      const idLower = element.id.toLowerCase();
      for (const keyword of keywords) {
        if (idLower.includes(keyword.toLowerCase())) {
          score += 0.4;
          reasons.push(`ID contains keyword: ${keyword}`);
          break;
        }
      }
    }

    // Check class match
    if (element.classes && element.classes.length > 0) {
      for (const cls of element.classes) {
        const clsLower = cls.toLowerCase();
        for (const keyword of keywords) {
          if (clsLower.includes(keyword.toLowerCase())) {
            score += 0.2;
            reasons.push(`Class contains keyword: ${keyword}`);
            break;
          }
        }
      }
    }

    // Check text match
    if (element.text) {
      const textLower = element.text.toLowerCase();
      for (const keyword of keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          score += 0.3;
          reasons.push(`Text contains keyword: ${keyword}`);
          break;
        }
      }
    }

    // Check attributes (aria-label, data-*, etc.)
    if (element.attributes) {
      for (const [attr, value] of Object.entries(element.attributes)) {
        const valueLower = String(value).toLowerCase();
        for (const keyword of keywords) {
          if (valueLower.includes(keyword.toLowerCase())) {
            score += 0.2;
            reasons.push(`Attribute ${attr} contains keyword: ${keyword}`);
            break;
          }
        }
      }
    }

    return {
      score: Math.min(score, 1.0),
      reason: reasons.join('; ') || 'Partial match',
    };
  }

  /**
   * Generate selector for element
   */
  private static generateSelectorForElement(
    element: any,
    nodeType: string
  ): { selector: string; type: 'css' | 'xpath' } | null {
    // Prefer ID selector (most stable)
    if (element.id) {
      return {
        selector: `#${element.id}`,
        type: 'css',
      };
    }

    // Use class selector if available
    if (element.classes && element.classes.length > 0) {
      const classes = element.classes.filter((c: string) => !c.includes(' ')).join('.');
      if (classes) {
        return {
          selector: `${element.tag}.${classes}`,
          type: 'css',
        };
      }
    }

    // Use tag + attributes
    if (element.attributes) {
      const attrSelectors: string[] = [];
      for (const [attr, value] of Object.entries(element.attributes)) {
        if (attr.startsWith('data-') || attr === 'name' || attr === 'type') {
          attrSelectors.push(`[${attr}="${value}"]`);
        }
      }
      if (attrSelectors.length > 0) {
        return {
          selector: `${element.tag}${attrSelectors.join('')}`,
          type: 'css',
        };
      }
    }

    // Fallback: tag + text (XPath)
    if (element.text && element.text.length < 50) {
      const escapedText = element.text.replace(/'/g, "\\'");
      return {
        selector: `//${element.tag}[text()='${escapedText}']`,
        type: 'xpath',
      };
    }

    // Last resort: tag selector
    return {
      selector: element.tag,
      type: 'css',
    };
  }

  /**
   * Update selectors for all nodes on same page
   */
  static updateSelectorsForPage(
    workflow: Workflow,
    pageUrl: string,
    domContext: OptimizedDOMContext
  ): { workflow: Workflow; updates: Array<{ nodeId: string; oldSelector: string; newSelector: string }> } {
    const updates: Array<{ nodeId: string; oldSelector: string; newSelector: string }> = [];
    let updatedWorkflow = workflow;

    // Find all nodes that need selectors on this page
    for (const node of workflow.nodes) {
      const nodeData = node.data as any;
      if (!nodeData?.selector) continue;

      // Only update interaction nodes
      const interactionTypes = ['click', 'type', 'select', 'hover', 'scroll', 'verify'];
      if (!interactionTypes.includes(node.type)) continue;

      // Infer selector for this node
      const action = nodeData.label || `${node.type} element`;
      const inferredSelectors = this.inferSelectorRuleBased(action, domContext, node.type);

      if (inferredSelectors.length > 0) {
        const bestSelector = inferredSelectors[0];
        const oldSelector = nodeData.selector;

        // Update workflow
        updatedWorkflow = WorkflowModifier.updateNodeSelector(
          updatedWorkflow,
          node.id,
          bestSelector.selector
        );

        // Also update selectorType if available
        if (nodeData.selectorType !== undefined) {
          updatedWorkflow = WorkflowModifier.updateNodeProperty(
            updatedWorkflow,
            node.id,
            'selectorType',
            bestSelector.type
          );
        }

        updates.push({
          nodeId: node.id,
          oldSelector,
          newSelector: bestSelector.selector,
        });
      }
    }

    return { workflow: updatedWorkflow, updates };
  }

  /**
   * Convert PageDebugInfo to OptimizedDOMContext
   */
  static convertToOptimizedContext(
    pageDebugInfo: PageDebugInfo,
    action?: string
  ): OptimizedDOMContext {
    // Parse HTML to extract relevant elements
    const relevantElements: OptimizedDOMContext['relevantElements'] = [];

    // Add elements from accessibility tree (role + name for getByRole-style hints)
    if (pageDebugInfo.accessibilityTree) {
      const a11yElements = this.flattenAccessibilityTree(pageDebugInfo.accessibilityTree);
      for (const node of a11yElements) {
        if (node.role && ['button', 'link', 'textbox', 'combobox', 'heading', 'checkbox', 'radio'].includes(node.role)) {
          const tag = node.role === 'link' ? 'a' : node.role === 'textbox' ? 'input' : node.role === 'combobox' ? 'select' : node.role;
          relevantElements.push({
            tag,
            attributes: node.name ? { 'aria-label': node.name, role: node.role } : { role: node.role },
            text: node.name,
            role: node.role,
          });
        }
      }
    }

    if (pageDebugInfo.pageSource) {
      // Simple HTML parsing - extract interactive elements
      // This is a simplified version - in production, use proper HTML parser
      const html = pageDebugInfo.pageSource;
      
      // Extract elements with IDs
      const idMatches = html.matchAll(/<(\w+)[^>]*\s+id=["']([^"']+)["'][^>]*>/gi);
      for (const match of idMatches) {
        const tag = match[1].toLowerCase();
        const id = match[2];
        const classes = this.extractClasses(match[0]);
        const attributes = this.extractAttributes(match[0]);
        
        relevantElements.push({
          tag,
          id,
          classes,
          attributes,
        });
      }

      // Extract buttons and inputs
      const buttonMatches = html.matchAll(/<(button|input|a|select|textarea)[^>]*>/gi);
      for (const match of buttonMatches) {
        const tag = match[1].toLowerCase();
        const fullTag = match[0];
        const id = this.extractId(fullTag);
        const classes = this.extractClasses(fullTag);
        const attributes = this.extractAttributes(fullTag);
        const text = this.extractText(fullTag);

        // Avoid duplicates
        if (!id || !relevantElements.some(e => e.id === id)) {
          relevantElements.push({
            tag,
            id,
            classes,
            attributes,
            text,
          });
        }
      }
    }

    return {
      pageUrl: pageDebugInfo.pageUrl || '',
      relevantElements: relevantElements.slice(0, 80), // Limit to 80 elements (increased to include a11y)
      similarSelectors: pageDebugInfo.similarSelectors?.map(s => ({
        selector: s.selector,
        selectorType: s.selectorType,
        reason: s.reason,
      })),
      action,
    };
  }

  /**
   * Flatten accessibility tree to array of interactive nodes
   */
  private static flattenAccessibilityTree(
    node: PageDebugInfo['accessibilityTree'],
    result: Array<{ role?: string; name?: string; value?: string; level?: number }> = []
  ): Array<{ role?: string; name?: string; value?: string; level?: number }> {
    if (!node) return result;
    if (node.role && node.role !== 'WebArea' && node.role !== 'generic') {
      result.push({ role: node.role, name: node.name, value: node.value, level: node.level });
    }
    for (const child of node.children || []) {
      this.flattenAccessibilityTree(child, result);
    }
    return result;
  }

  private static extractId(html: string): string | undefined {
    const match = html.match(/\s+id=["']([^"']+)["']/i);
    return match ? match[1] : undefined;
  }

  private static extractClasses(html: string): string[] {
    const match = html.match(/\s+class=["']([^"']+)["']/i);
    if (!match) return [];
    return match[1].split(/\s+/).filter(c => c.length > 0);
  }

  private static extractAttributes(html: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const matches = html.matchAll(/\s+(\w+(?:-\w+)*)=["']([^"']+)["']/gi);
    for (const match of matches) {
      attrs[match[1]] = match[2];
    }
    return attrs;
  }

  private static extractText(html: string): string | undefined {
    // Simple text extraction - get text between tags
    const match = html.match(/>([^<]+)</);
    return match ? match[1].trim() : undefined;
  }
}
