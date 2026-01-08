import { BaseNode, GetTextNodeData, ScreenshotNodeData, WaitNodeData, IntValueNodeData, StringValueNodeData, BooleanValueNodeData, InputValueNodeData, NodeType } from '@automflows/shared';
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

export class IntValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as IntValueNodeData;
    
    // Store the value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, data.value);
    
    // Also store in data for compatibility
    context.setData('value', data.value);
  }
}

export class StringValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as StringValueNodeData;
    
    // Store the value in context with the node ID as key
    context.setVariable(node.id, data.value);
    
    // Also store in data for compatibility
    context.setData('value', data.value);
  }
}

export class BooleanValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as BooleanValueNodeData;
    
    // Store the value in context with the node ID as key
    context.setVariable(node.id, data.value);
    
    // Also store in data for compatibility
    context.setData('value', data.value);
  }
}

export class InputValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as InputValueNodeData;
    
    // Convert value based on dataType
    let convertedValue: string | number | boolean = data.value;
    
    if (data.dataType === 'int') {
      convertedValue = typeof data.value === 'number' ? Math.floor(data.value) : parseInt(String(data.value), 10);
      if (isNaN(convertedValue as number)) {
        convertedValue = 0;
      }
    } else if (data.dataType === 'float' || data.dataType === 'double') {
      convertedValue = typeof data.value === 'number' ? data.value : parseFloat(String(data.value));
      if (isNaN(convertedValue as number)) {
        convertedValue = 0;
      }
    } else if (data.dataType === 'boolean') {
      convertedValue = typeof data.value === 'boolean' ? data.value : (data.value === true || data.value === 'true' || data.value === 1 || data.value === '1');
    } else {
      // String
      convertedValue = String(data.value || '');
    }
    
    // Store the converted value in context with the node ID as key
    context.setVariable(node.id, convertedValue);
    
    // Also store in data for compatibility
    context.setData('value', convertedValue);
  }
}

