// Example plugin handler
// This demonstrates how to create a custom node handler for AutoMFlows

import { BaseNode } from '@automflows/shared';
import { NodeHandler } from '../../backend/src/nodes/base';
import { ContextManager } from '../../backend/src/engine/context';

interface FillFormNodeData {
  fields: Array<{
    selector: string;
    selectorType?: 'css' | 'xpath';
    value: string;
    timeout?: number;
  }>;
}

interface ScrollToNodeData {
  selector: string;
  selectorType?: 'css' | 'xpath';
  behavior?: 'auto' | 'smooth';
  timeout?: number;
}

export class FillFormHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as FillFormNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.fields || !Array.isArray(data.fields) || data.fields.length === 0) {
      throw new Error('Fields array is required for Fill Form node');
    }

    // Fill each field
    for (const field of data.fields) {
      if (!field.selector) {
        throw new Error('Selector is required for each field');
      }

      const timeout = field.timeout || 30000;
      const selector = field.selector;
      const value = field.value || '';

      try {
        if (field.selectorType === 'xpath') {
          await page.locator(`xpath=${selector}`).fill(value, { timeout });
        } else {
          await page.fill(selector, value, { timeout });
        }
      } catch (error: any) {
        throw new Error(`Failed to fill field with selector "${selector}": ${error.message}`);
      }
    }
  }
}

export class ScrollToHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ScrollToNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Scroll To node');
    }

    const timeout = data.timeout || 30000;
    const selector = data.selector;
    const behavior = data.behavior || 'smooth';

    try {
      let element;
      if (data.selectorType === 'xpath') {
        element = page.locator(`xpath=${selector}`);
      } else {
        element = page.locator(selector);
      }

      await element.scrollIntoViewIfNeeded({ timeout });
      
      // Optionally scroll with smooth behavior using JavaScript
      if (behavior === 'smooth') {
        await page.evaluate((sel: string) => {
          const el = document.querySelector(sel);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, selector);
      }
    } catch (error: any) {
      throw new Error(`Failed to scroll to element with selector "${selector}": ${error.message}`);
    }
  }
}

// Export handlers by node type for plugin loader
export default {
  'example.fillForm': FillFormHandler,
  'example.scrollTo': ScrollToHandler,
};

