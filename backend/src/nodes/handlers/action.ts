import { BaseNode, ActionNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

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

        // Scroll to element if scrollThenAction is enabled
        const scrollThenAction = context.getData('scrollThenAction');
        if (scrollThenAction && selector) {
          try {
            await LocatorHelper.scrollToElementSmooth(page, selector, data.selectorType || 'css', timeout);
          } catch (error: any) {
            // Log warning but continue execution
            console.warn(`[ActionHandler] Failed to scroll to element before action: ${error.message}`);
          }
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
