import { BaseNode, TypeNodeData, ActionNodeData, FormInputNodeData, KeyboardNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { WaitHelper } from '../utils/waitHelper';
import { RetryHelper } from '../utils/retryHelper';
import { VariableInterpolator } from '../utils/variableInterpolator';

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
    // Interpolate template variables in selector and text (e.g., ${data.productIndex})
    const selector = VariableInterpolator.interpolateString(data.selector, context);
    const text = VariableInterpolator.interpolateString(data.text, context);

    // Execute type operation with retry logic (includes wait conditions)
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const waitAfterOperation = data.waitAfterOperation || false;
        
        // Execute waits before operation if waitAfterOperation is false
        if (!waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'before',
          });
        }

        // Execute type operation
        if (data.selectorType === 'xpath') {
          await page.locator(`xpath=${selector}`).fill(text, { timeout });
        } else {
          await page.fill(selector, text, { timeout });
        }

        // Execute waits after operation if waitAfterOperation is true
        if (waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'after',
          });
        }
      },
      {
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      },
      page
    );
    
    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`Type operation failed silently on selector: ${selector}`);
    }
  }
}

export class ActionHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ActionNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Action node');
    }

    if (!data.action) {
      throw new Error('Action is required for Action node');
    }

    const timeout = data.timeout || 30000;
    // Interpolate template variables in selector (e.g., ${data.productIndex})
    const selector = VariableInterpolator.interpolateString(data.selector, context);

    // Execute action operation with retry logic (includes wait conditions)
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const waitAfterOperation = data.waitAfterOperation || false;
        
        // Execute waits before operation if waitAfterOperation is false
        if (!waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'before',
          });
        }

        // Execute action based on action type
        switch (data.action) {
          case 'click':
            if (data.selectorType === 'xpath') {
              await page.locator(`xpath=${selector}`).click({ 
                button: data.button || 'left',
                timeout 
              });
            } else {
              await page.click(selector, { 
                button: data.button || 'left',
                timeout 
              });
            }
            break;

          case 'doubleClick':
            if (data.selectorType === 'xpath') {
              await page.locator(`xpath=${selector}`).dblclick({ timeout });
            } else {
              await page.dblclick(selector, { timeout });
            }
            // Apply delay if specified
            if (data.delay) {
              await page.waitForTimeout(data.delay);
            }
            break;

          case 'rightClick':
            if (data.selectorType === 'xpath') {
              await page.locator(`xpath=${selector}`).click({ 
                button: 'right',
                timeout 
              });
            } else {
              await page.click(selector, { 
                button: 'right',
                timeout 
              });
            }
            break;

          case 'hover':
            if (data.selectorType === 'xpath') {
              await page.locator(`xpath=${selector}`).hover({ timeout });
            } else {
              await page.hover(selector, { timeout });
            }
            // Apply delay if specified
            if (data.delay) {
              await page.waitForTimeout(data.delay);
            }
            break;

          default:
            throw new Error(`Unknown action type: ${data.action}`);
        }

        // Execute waits after operation if waitAfterOperation is true
        if (waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'after',
          });
        }
      },
      {
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      },
      page
    );
    
    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`Action operation failed silently on selector: ${selector} with action: ${data.action}`);
    }
  }
}

export class FormInputHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as FormInputNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Form Input node');
    }

    if (!data.action) {
      throw new Error('Action is required for Form Input node');
    }

    const timeout = data.timeout || 30000;
    // Interpolate template variables in selector (e.g., ${data.productIndex})
    const selector = VariableInterpolator.interpolateString(data.selector, context);

    // Execute form input operation with retry logic (includes wait conditions)
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const waitAfterOperation = data.waitAfterOperation || false;
        
        // Execute waits before operation if waitAfterOperation is false
        if (!waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'before',
          });
        }

        // Execute action based on action type
        const locator = data.selectorType === 'xpath' 
          ? page.locator(`xpath=${selector}`)
          : page.locator(selector);

        switch (data.action) {
          case 'select':
            if (!data.values) {
              throw new Error('Values are required for select action');
            }
            // Handle values - can be string or array
            const selectValues = Array.isArray(data.values) ? data.values : [data.values];
            // Interpolate values
            const interpolatedValues = selectValues.map(v => VariableInterpolator.interpolateString(String(v), context));
            
            // Determine select options based on selectBy
            const selectOptions: any = { timeout };
            if (data.selectBy === 'label') {
              selectOptions.label = interpolatedValues;
            } else if (data.selectBy === 'index') {
              selectOptions.index = interpolatedValues.map(v => parseInt(v, 10));
            } else {
              selectOptions.value = interpolatedValues;
            }

            await locator.selectOption(selectOptions);
            break;

          case 'check':
            if (data.force) {
              await locator.setChecked(true, { timeout, force: true });
            } else {
              await locator.check({ timeout });
            }
            break;

          case 'uncheck':
            if (data.force) {
              await locator.setChecked(false, { timeout, force: true });
            } else {
              await locator.uncheck({ timeout });
            }
            break;

          case 'upload':
            if (!data.filePaths) {
              throw new Error('File paths are required for upload action');
            }
            // Handle filePaths - can be string or array
            const filePaths = Array.isArray(data.filePaths) ? data.filePaths : [data.filePaths];
            // Interpolate file paths
            const interpolatedPaths = filePaths.map(p => VariableInterpolator.interpolateString(String(p), context));
            
            await locator.setInputFiles(interpolatedPaths, { timeout });
            break;

          default:
            throw new Error(`Unknown action type: ${data.action}`);
        }

        // Execute waits after operation if waitAfterOperation is true
        if (waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'after',
          });
        }
      },
      {
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      },
      page
    );
    
    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`Form Input operation failed silently on selector: ${selector} with action: ${data.action}`);
    }
  }
}

export class KeyboardHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as KeyboardNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Keyboard node');
    }

    const timeout = data.timeout || 30000;

    // Execute keyboard operation with retry logic (includes wait conditions)
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const waitAfterOperation = data.waitAfterOperation || false;
        
        // Execute waits before operation if waitAfterOperation is false
        if (!waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'before',
          });
        }

        // Focus element first if selector is provided
        if (data.selector) {
          const selector = VariableInterpolator.interpolateString(data.selector, context);
          const locator = data.selectorType === 'xpath' ? page.locator(`xpath=${selector}`) : page.locator(selector);
          await locator.focus({ timeout });
        }

        // Execute action based on action type
        switch (data.action) {
          case 'press':
            if (!data.key) {
              throw new Error('Key is required for press action');
            }
            const key = VariableInterpolator.interpolateString(data.key, context);
            if (data.selector) {
              const selector = VariableInterpolator.interpolateString(data.selector, context);
              const locator = data.selectorType === 'xpath' ? page.locator(`xpath=${selector}`) : page.locator(selector);
              await locator.press(key, { timeout });
            } else {
              await page.keyboard.press(key);
            }
            break;

          case 'type':
            if (!data.text) {
              throw new Error('Text is required for type action');
            }
            const text = VariableInterpolator.interpolateString(data.text, context);
            if (data.selector) {
              const selector = VariableInterpolator.interpolateString(data.selector, context);
              const locator = data.selectorType === 'xpath' ? page.locator(`xpath=${selector}`) : page.locator(selector);
              if (data.delay) {
                await locator.type(text, { delay: data.delay, timeout });
              } else {
                await locator.type(text, { timeout });
              }
            } else {
              if (data.delay) {
                await page.keyboard.type(text, { delay: data.delay });
              } else {
                await page.keyboard.type(text);
              }
            }
            break;

          case 'insertText':
            if (!data.text) {
              throw new Error('Text is required for insertText action');
            }
            const insertText = VariableInterpolator.interpolateString(data.text, context);
            if (data.selector) {
              const selector = VariableInterpolator.interpolateString(data.selector, context);
              const locator = data.selectorType === 'xpath' ? page.locator(`xpath=${selector}`) : page.locator(selector);
              await locator.fill(insertText, { timeout });
            } else {
              await page.keyboard.insertText(insertText);
            }
            break;

          case 'shortcut':
            if (!data.shortcut) {
              throw new Error('Shortcut is required for shortcut action');
            }
            const shortcut = VariableInterpolator.interpolateString(data.shortcut, context);
            // Parse shortcut (e.g., "Control+C" -> ["Control", "c"])
            const keys = shortcut.split('+').map(k => k.trim());
            if (data.selector) {
              const selector = VariableInterpolator.interpolateString(data.selector, context);
              const locator = data.selectorType === 'xpath' ? page.locator(`xpath=${selector}`) : page.locator(selector);
              await locator.press(shortcut as any, { timeout });
            } else {
              await page.keyboard.press(shortcut as any);
            }
            break;

          case 'down':
            if (!data.key) {
              throw new Error('Key is required for down action');
            }
            const downKey = VariableInterpolator.interpolateString(data.key, context);
            await page.keyboard.down(downKey);
            break;

          case 'up':
            if (!data.key) {
              throw new Error('Key is required for up action');
            }
            const upKey = VariableInterpolator.interpolateString(data.key, context);
            await page.keyboard.up(upKey);
            break;

          default:
            throw new Error(`Unknown keyboard action type: ${data.action}`);
        }

        // Execute waits after operation if waitAfterOperation is true
        if (waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'after',
          });
        }
      },
      {
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      },
      page
    );
    
    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`Keyboard operation failed silently with action: ${data.action}`);
    }
  }
}

export class ScrollHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ScrollNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Scroll node');
    }

    const timeout = data.timeout || 30000;

    // Execute scroll operation with retry logic (includes wait conditions)
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const waitAfterOperation = data.waitAfterOperation || false;
        
        // Execute waits before operation if waitAfterOperation is false
        if (!waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'before',
          });
        }

        // Execute action based on action type
        switch (data.action) {
          case 'scrollToElement':
            if (!data.selector) {
              throw new Error('Selector is required for scrollToElement action');
            }
            const selector = VariableInterpolator.interpolateString(data.selector, context);
            const locator = data.selectorType === 'xpath' ? page.locator(`xpath=${selector}`) : page.locator(selector);
            await locator.scrollIntoViewIfNeeded({ timeout });
            break;

          case 'scrollToPosition':
            if (data.x === undefined || data.y === undefined) {
              throw new Error('x and y coordinates are required for scrollToPosition action');
            }
            await page.evaluate((x, y) => {
              window.scrollTo(x, y);
            }, data.x, data.y);
            break;

          case 'scrollBy':
            if (data.deltaX === undefined || data.deltaY === undefined) {
              throw new Error('deltaX and deltaY are required for scrollBy action');
            }
            await page.evaluate((dx, dy) => {
              window.scrollBy(dx, dy);
            }, data.deltaX, data.deltaY);
            break;

          case 'scrollToTop':
            await page.evaluate(() => {
              window.scrollTo(0, 0);
            });
            break;

          case 'scrollToBottom':
            await page.evaluate(() => {
              window.scrollTo(0, document.documentElement.scrollHeight);
            });
            break;

          default:
            throw new Error(`Unknown scroll action type: ${data.action}`);
        }

        // Execute waits after operation if waitAfterOperation is true
        if (waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: timeout,
            waitTiming: 'after',
          });
        }
      },
      {
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      },
      page
    );
    
    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`Scroll operation failed silently with action: ${data.action}`);
    }
  }
}
