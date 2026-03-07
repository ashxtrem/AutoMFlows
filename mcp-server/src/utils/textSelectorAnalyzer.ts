/**
 * TextSelectorAnalyzer - Bridge between accessibility snapshots and Text(Auto-detect) selectors.
 *
 * Given an accessibility snapshot tree and a step intent, finds the best visible text label
 * to use as a `selectorType: 'text'` selector, and determines if an `nth` modifier is needed.
 */

import { AccessibilityNode } from './types.js';

export type { AccessibilityNode };

export interface TextSelectorResult {
  text: string;
  nth?: number;
  confidence: 'high' | 'medium' | 'low';
}

interface FlatA11yNode {
  role?: string;
  name?: string;
  value?: string;
  level?: number;
}

const INTERACTIVE_ROLES = [
  'button', 'link', 'textbox', 'combobox', 'heading',
  'checkbox', 'radio', 'menuitem', 'tab', 'option',
  'searchbox', 'switch', 'spinbutton', 'slider',
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'to', 'in', 'on', 'at', 'for', 'of', 'and', 'or',
  'click', 'type', 'enter', 'press', 'fill', 'navigate', 'go', 'open',
  'visit', 'search', 'find', 'select', 'check', 'verify', 'wait',
]);

const TARGET_ALIASES: Record<string, string[]> = {
  search: ['search', 'q', 'query', 'find', 'look up'],
  submit: ['submit', 'send', 'go', 'search', 'apply'],
  login: ['login', 'sign in', 'signin', 'log in'],
  register: ['register', 'sign up', 'signup', 'create account'],
  'add to cart': ['add to cart', 'add to basket', 'buy now', 'purchase'],
  cart: ['cart', 'basket', 'bag', 'shopping cart', 'my cart'],
  next: ['next', 'continue', 'proceed', 'forward'],
  back: ['back', 'previous', 'go back'],
  close: ['close', 'dismiss', 'cancel', 'x'],
};

export class TextSelectorAnalyzer {
  /**
   * Given an a11y snapshot tree, step action, and target description,
   * find the best visible text to use as a Text(Auto-detect) selector.
   */
  static analyzeForTextSelector(
    tree: AccessibilityNode,
    action: string,
    target?: string,
    value?: string
  ): TextSelectorResult | null {
    const elements = this.flattenTree(tree);
    const keywords = this.extractKeywords(action, target);

    const scored = this.scoreElements(elements, keywords, action, target);
    if (scored.length === 0) return null;

    const best = scored[0];
    if (!best.node.name || best.node.name.trim().length === 0) return null;

    const text = best.node.name.trim();

    const nthIndex = this.determineNth(elements, text, best.node);

    return {
      text,
      nth: nthIndex >= 0 ? nthIndex : undefined,
      confidence: best.score > 0.7 ? 'high' : best.score > 0.4 ? 'medium' : 'low',
    };
  }

  /**
   * Analyze snapshot and return results for multiple steps at once.
   * Each step gets matched independently against the same snapshot.
   */
  static analyzeForMultipleSteps(
    tree: AccessibilityNode,
    steps: Array<{ action: string; target?: string; value?: string }>
  ): Array<TextSelectorResult | null> {
    return steps.map(step =>
      this.analyzeForTextSelector(tree, step.action, step.target, step.value)
    );
  }

  /**
   * Count how many interactive elements in the tree share the same name/text.
   */
  static countTextOccurrences(tree: AccessibilityNode, text: string): number {
    const elements = this.flattenTree(tree);
    const textLower = text.toLowerCase();
    return elements.filter(
      el => INTERACTIVE_ROLES.includes(el.role || '') &&
        el.name && el.name.toLowerCase() === textLower
    ).length;
  }

  private static flattenTree(
    node: AccessibilityNode,
    result: FlatA11yNode[] = []
  ): FlatA11yNode[] {
    if (!node) return result;
    if (node.role && node.role !== 'WebArea' && node.role !== 'generic' && node.role !== 'none') {
      result.push({
        role: node.role,
        name: node.name,
        value: node.value,
        level: node.level,
      });
    }
    for (const child of node.children || []) {
      this.flattenTree(child, result);
    }
    return result;
  }

  private static extractKeywords(action: string, target?: string): string[] {
    const combined = [action, target || ''].join(' ').toLowerCase();
    return combined
      .split(/[\s,._\-/]+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  private static scoreElements(
    elements: FlatA11yNode[],
    keywords: string[],
    action: string,
    target?: string
  ): Array<{ node: FlatA11yNode; score: number }> {
    const scored: Array<{ node: FlatA11yNode; score: number }> = [];

    for (const el of elements) {
      if (!INTERACTIVE_ROLES.includes(el.role || '')) continue;
      if (!el.name || el.name.trim().length === 0) continue;

      const score = this.computeScore(el, keywords, action, target);
      if (score > 0) {
        scored.push({ node: el, score });
      }
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  private static computeScore(
    node: FlatA11yNode,
    keywords: string[],
    action: string,
    target?: string
  ): number {
    let score = 0;
    const nameLower = (node.name || '').toLowerCase();

    // Role suitability for the action
    if (action === 'click' || action === 'submit') {
      if (['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab', 'option'].includes(node.role || '')) {
        score += 0.2;
      }
    }
    if (action === 'type' || action === 'fill') {
      if (['textbox', 'combobox', 'searchbox', 'spinbutton'].includes(node.role || '')) {
        score += 0.3;
      }
    }

    // Direct keyword match in the element name
    for (const kw of keywords) {
      if (nameLower.includes(kw)) {
        score += 0.4;
        break;
      }
    }

    // Exact alias match from TARGET_ALIASES
    if (target) {
      const targetLower = target.toLowerCase();
      for (const [, aliases] of Object.entries(TARGET_ALIASES)) {
        const targetMatches = aliases.some(a => targetLower.includes(a) || a.includes(targetLower));
        if (targetMatches) {
          const nameMatches = aliases.some(a => nameLower.includes(a));
          if (nameMatches) {
            score += 0.5;
            break;
          }
        }
      }
    }

    // Bonus: if target text is a substring of the element name or vice-versa (direct match)
    if (target) {
      const targetLower = target.toLowerCase().trim();
      if (nameLower.includes(targetLower) || targetLower.includes(nameLower)) {
        score += 0.3;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Determine the 0-based index of `matchedNode` among elements sharing the same text.
   * Returns -1 if the text is unique (no nth modifier needed).
   */
  private static determineNth(
    elements: FlatA11yNode[],
    text: string,
    matchedNode: FlatA11yNode
  ): number {
    const textLower = text.toLowerCase();
    const matchingElements = elements.filter(
      el => INTERACTIVE_ROLES.includes(el.role || '') &&
        el.name && el.name.toLowerCase() === textLower
    );
    if (matchingElements.length <= 1) return -1;
    const index = matchingElements.indexOf(matchedNode);
    return index >= 0 ? index : 0;
  }
}
