import { BaseNode, ScrollNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

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
