import { BaseNode, TypeNodeData, ActionNodeData, FormInputNodeData, KeyboardNodeData, ScrollNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { WaitHelper } from '../utils/waitHelper';
import { RetryHelper } from '../utils/retryHelper';
import { VariableInterpolator } from '../utils/variableInterpolator';
import { LocatorHelper } from '../utils/locatorHelper';

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
          }, context);
        }

        // Execute type operation based on inputMethod
        const inputMethod = data.inputMethod || 'fill'; // Default to 'fill' for backward compatibility
        const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');

        switch (inputMethod) {
          case 'fill':
            // Default behavior: clear and fill instantly
            await locator.fill(text, { timeout });
            break;

          case 'type':
            // Type character by character with delays (triggers keyboard events)
            // Clear field first if clearFirst is enabled
            if (data.clearFirst) {
              await locator.fill('', { timeout });
            }
            const typeDelay = data.delay || 0;
            await locator.type(text, { delay: typeDelay, timeout });
            break;

          case 'pressSequentially':
            // Type with configurable delays (same as type but more explicit)
            // Clear field first if clearFirst is enabled
            if (data.clearFirst) {
              await locator.fill('', { timeout });
            }
            const sequentialDelay = data.delay || 0;
            await locator.pressSequentially(text, { delay: sequentialDelay, timeout });
            break;

          case 'append':
            // Append text to existing value
            const currentValue = await locator.inputValue({ timeout }).catch(() => '');
            const appendedText = currentValue + text;
            await locator.fill(appendedText, { timeout });
            break;

          case 'prepend':
            // Prepend text to existing value
            const existingValue = await locator.inputValue({ timeout }).catch(() => '');
            const prependedText = text + existingValue;
            await locator.fill(prependedText, { timeout });
            break;

          case 'direct':
            // Set value directly via DOM without triggering events
            await locator.evaluate((element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
              element.value = value;
              // Trigger input event manually for some frameworks that listen to it
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }, text);
            break;

          default:
            // Fallback to fill for unknown methods
            await locator.fill(text, { timeout });
            break;
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
          }, context);
        }
      },
      RetryHelper.interpolateRetryOptions({
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      }, context),
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
          }, context);
        }

        // Execute action based on action type
        const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');
        
        switch (data.action) {
          case 'click':
            await locator.click({ 
              button: data.button || 'left',
              timeout 
            });
            break;

          case 'doubleClick':
            await locator.dblclick({ timeout });
            // Apply delay if specified
            if (data.delay) {
              await page.waitForTimeout(data.delay);
            }
            break;

          case 'rightClick':
            await locator.click({ 
              button: 'right',
              timeout 
            });
            break;

          case 'hover':
            await locator.hover({ timeout });
            // Apply delay if specified
            if (data.delay) {
              await page.waitForTimeout(data.delay);
            }
            break;

          case 'dragAndDrop':
            if (!data.targetSelector && (data.targetX === undefined || data.targetY === undefined)) {
              throw new Error('Target selector or target coordinates (targetX, targetY) are required for dragAndDrop action');
            }
            
            if (data.targetSelector) {
              // Drag to target element
              const targetSelector = VariableInterpolator.interpolateString(data.targetSelector, context);
              const targetLocator = LocatorHelper.createLocator(page, targetSelector, data.targetSelectorType || 'css');
              
              await locator.dragTo(targetLocator, { timeout });
            } else {
              // Drag to coordinates using mouse API
              const targetX = data.targetX || 0;
              const targetY = data.targetY || 0;
              
              // Get source element bounding box
              const sourceBox = await locator.boundingBox({ timeout });
              if (!sourceBox) {
                throw new Error('Source element not found or not visible');
              }
              
              // Calculate source center
              const sourceX = sourceBox.x + sourceBox.width / 2;
              const sourceY = sourceBox.y + sourceBox.height / 2;
              
              // Perform drag and drop using mouse API
              await page.mouse.move(sourceX, sourceY);
              await page.mouse.down();
              await page.mouse.move(targetX, targetY);
              await page.mouse.up();
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
          }, context);
        }
      },
      RetryHelper.interpolateRetryOptions({
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      }, context),
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
          }, context);
        }

        // Execute action based on action type
        const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');

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
            // Playwright expects values and timeout to be separate parameters
            let selectOptionValue: string | string[] | { value?: string; label?: string; index?: number };
            
            if (data.selectBy === 'label') {
              selectOptionValue = interpolatedValues.length === 1 
                ? { label: interpolatedValues[0] }
                : interpolatedValues.map(v => ({ label: v })) as any; // Playwright accepts array of objects
            } else if (data.selectBy === 'index') {
              const indices = interpolatedValues.map(v => parseInt(v, 10));
              selectOptionValue = indices.length === 1 
                ? { index: indices[0] }
                : indices.map(i => ({ index: i })) as any; // Playwright accepts array of objects
            } else {
              // For value, pass string or array directly (Playwright accepts both)
              selectOptionValue = interpolatedValues.length === 1 
                ? interpolatedValues[0] 
                : interpolatedValues;
            }

            await locator.selectOption(selectOptionValue as any, { timeout });
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
          }, context);
        }
      },
      RetryHelper.interpolateRetryOptions({
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      }, context),
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
          }, context);
        }

        // Interpolate selector once if provided
        let locator: any = null;
        if (data.selector) {
          const selector = VariableInterpolator.interpolateString(data.selector, context);
          locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');
          await locator.focus({ timeout });
        }

        // Execute action based on action type
        switch (data.action) {
          case 'press':
            if (!data.key) {
              throw new Error('Key is required for press action');
            }
            const key = VariableInterpolator.interpolateString(data.key, context);
            if (locator) {
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
            if (locator) {
              // Clear field first if clearFirst is enabled
              if (data.clearFirst) {
                await locator.fill('', { timeout });
              }
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
            if (locator) {
              // Clear field first if clearFirst is enabled (fill already clears, but we'll be explicit)
              if (data.clearFirst) {
                await locator.fill('', { timeout });
              }
              await locator.fill(insertText, { timeout });
            } else {
              // For insertText without selector, clearFirst doesn't apply as we can't target a specific element
              await page.keyboard.insertText(insertText);
            }
            break;

          case 'shortcut':
            if (!data.shortcut) {
              throw new Error('Shortcut is required for shortcut action');
            }
            const shortcut = VariableInterpolator.interpolateString(data.shortcut, context);
            // Note: shortcut is used directly; parsing to keys array is not currently used
            if (locator) {
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
          }, context);
        }
      },
      RetryHelper.interpolateRetryOptions({
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      }, context),
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
          }, context);
        }

        // Execute action based on action type
        switch (data.action) {
          case 'scrollToElement':
            if (!data.selector) {
              throw new Error('Selector is required for scrollToElement action');
            }
            const selector = VariableInterpolator.interpolateString(data.selector, context);
            const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');
            await locator.scrollIntoViewIfNeeded({ timeout });
            break;

          case 'scrollToPosition':
            if (data.x === undefined || data.y === undefined) {
              throw new Error('x and y coordinates are required for scrollToPosition action');
            }
            await page.evaluate((x: number, y: number) => {
              window.scrollTo(x, y);
            }, data.x, data.y);
            break;

          case 'scrollBy':
            if (data.deltaX === undefined || data.deltaY === undefined) {
              throw new Error('deltaX and deltaY are required for scrollBy action');
            }
            await page.evaluate((dx: number, dy: number) => {
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
          }, context);
        }
      },
      RetryHelper.interpolateRetryOptions({
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      }, context),
      page
    );
    
    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`Scroll operation failed silently with action: ${data.action}`);
    }
  }
}
