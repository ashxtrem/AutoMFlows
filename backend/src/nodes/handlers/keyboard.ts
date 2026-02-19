import { BaseNode, KeyboardNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

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
            waitForSelectorModifiers: data.waitForSelectorModifiers,
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
          
          // Scroll to element if scrollThenAction is enabled
          const scrollThenAction = context.getData('scrollThenAction');
          if (scrollThenAction && selector) {
            try {
              await LocatorHelper.scrollToElementSmooth(page, selector, data.selectorType || 'css', timeout, data.selectorModifiers);
            } catch (error: any) {
              // Log warning but continue execution
              console.warn(`[KeyboardHandler] Failed to scroll to element before action: ${error.message}`);
            }
          }
          
          locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css', data.selectorModifiers);
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
            waitForSelectorModifiers: data.waitForSelectorModifiers,
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
