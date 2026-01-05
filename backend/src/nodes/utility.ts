import { BaseNode, GetTextNodeData, ScreenshotNodeData, WaitNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';

export class GetTextHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as GetTextNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Get Text node');
    }

    const timeout = data.timeout || 30000;
    const selector = data.selector;
    let text: string | null;

    try {
      if (data.selectorType === 'xpath') {
        text = await page.locator(`xpath=${selector}`).textContent({ timeout });
      } else {
        text = await page.textContent(selector, { timeout });
      }

      const outputVariable = data.outputVariable || 'text';
      context.setData(outputVariable, text || '');
    } catch (error: any) {
      if (data.failSilently) {
        console.warn(`GetText failed silently for selector "${selector}": ${error.message}`);
        const outputVariable = data.outputVariable || 'text';
        context.setData(outputVariable, '');
        return;
      }
      throw error;
    }
  }
}

export class ScreenshotHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ScreenshotNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const playwright = (context as any).playwright as any;
    if (!playwright) {
      throw new Error('Playwright manager not found in context');
    }

    try {
      const fullPage = data.fullPage || false;
      const screenshotPath = await playwright.takeScreenshot(data.path, fullPage);

      context.setData('screenshotPath', screenshotPath);
    } catch (error: any) {
      if (data.failSilently) {
        console.warn(`Screenshot failed silently: ${error.message}`);
        return;
      }
      throw error;
    }
  }
}

export class WaitHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as WaitNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    try {
      if (data.waitType === 'timeout') {
        const timeout = typeof data.value === 'number' ? data.value : parseInt(String(data.value), 10);
        if (isNaN(timeout)) {
          throw new Error('Invalid timeout value for Wait node');
        }
        await page.waitForTimeout(timeout);
      } else if (data.waitType === 'selector') {
        const selector = String(data.value);
        const timeout = data.timeout || 30000;

        if (data.selectorType === 'xpath') {
          await page.locator(`xpath=${selector}`).waitFor({ timeout });
        } else {
          await page.waitForSelector(selector, { timeout });
        }
      } else {
        throw new Error(`Invalid wait type: ${data.waitType}`);
      }
    } catch (error: any) {
      if (data.failSilently) {
        console.warn(`Wait failed silently: ${error.message}`);
        return;
      }
      throw error;
    }
  }
}

