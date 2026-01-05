import { BaseNode, ClickNodeData, TypeNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';

export class ClickHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ClickNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Click node');
    }

    const timeout = data.timeout || 30000;
    const selector = data.selector;

    try {
      if (data.selectorType === 'xpath') {
        await page.locator(`xpath=${selector}`).click({ timeout });
      } else {
        await page.click(selector, { timeout });
      }
    } catch (error: any) {
      if (data.failSilently) {
        console.warn(`Click failed silently for selector "${selector}": ${error.message}`);
        return;
      }
      throw error;
    }
  }
}

export class TypeHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as TypeNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Type node');
    }

    if (data.text === undefined) {
      throw new Error('Text is required for Type node');
    }

    const timeout = data.timeout || 30000;
    const selector = data.selector;
    const text = data.text;

    try {
      if (data.selectorType === 'xpath') {
        await page.locator(`xpath=${selector}`).fill(text, { timeout });
      } else {
        await page.fill(selector, text, { timeout });
      }
    } catch (error: any) {
      if (data.failSilently) {
        console.warn(`Type failed silently for selector "${selector}": ${error.message}`);
        return;
      }
      throw error;
    }
  }
}

