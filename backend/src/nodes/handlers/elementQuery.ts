import { BaseNode, ElementQueryNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

export class ElementQueryHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ElementQueryNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Element Query node');
    }

    if (!data.action) {
      throw new Error('Action is required for Element Query node');
    }

    const timeout = data.timeout || 30000;
    // Interpolate template variables in selector (e.g., ${data.productIndex})
    const selector = VariableInterpolator.interpolateString(data.selector, context);
    
    // Determine output variable name based on action
    let outputVariable: string;
    switch (data.action) {
      case 'getText':
        outputVariable = data.outputVariable || 'text';
        break;
      case 'getAttribute':
        outputVariable = data.outputVariable || 'attribute';
        break;
      case 'getCount':
        outputVariable = data.outputVariable || 'count';
        break;
      case 'isVisible':
        outputVariable = data.outputVariable || 'isVisible';
        break;
      case 'isEnabled':
        outputVariable = data.outputVariable || 'isEnabled';
        break;
      case 'isChecked':
        outputVariable = data.outputVariable || 'isChecked';
        break;
      case 'getBoundingBox':
        outputVariable = data.outputVariable || 'boundingBox';
        break;
      case 'getAllText':
        outputVariable = data.outputVariable || 'text';
        break;
      default:
        outputVariable = data.outputVariable || 'result';
    }

    // Execute query operation with retry logic (includes wait conditions)
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
            console.warn(`[ElementQueryHandler] Failed to scroll to element before action: ${error.message}`);
          }
        }

        // Execute action based on action type
        let queryResult: any;
        const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');

        switch (data.action) {
          case 'getText':
            queryResult = await locator.textContent({ timeout });
            queryResult = queryResult || '';
            break;

          case 'getAttribute':
            if (!data.attributeName) {
              throw new Error('Attribute name is required for getAttribute action');
            }
            const attributeName = VariableInterpolator.interpolateString(data.attributeName, context);
            queryResult = await locator.getAttribute(attributeName, { timeout });
            queryResult = queryResult || null;
            break;

          case 'getCount':
            const count = await locator.count();
            queryResult = count;
            break;

          case 'isVisible':
            try {
              await locator.waitFor({ state: 'visible', timeout });
              queryResult = true;
            } catch {
              queryResult = false;
            }
            break;

          case 'isEnabled':
            const isEnabled = await locator.isEnabled({ timeout }).catch(() => false);
            queryResult = isEnabled;
            break;

          case 'isChecked':
            const isChecked = await locator.isChecked({ timeout }).catch(() => false);
            queryResult = isChecked;
            break;

          case 'getBoundingBox':
            const box = await locator.boundingBox({ timeout });
            queryResult = box || { x: 0, y: 0, width: 0, height: 0 };
            break;

          case 'getAllText':
            const allElements = await locator.all();
            const allTexts: string[] = [];
            for (const element of allElements) {
              const text = await element.textContent();
              if (text !== null) {
                allTexts.push(text);
              }
            }
            queryResult = allTexts;
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

        return queryResult;
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
      throw new Error(`Element Query operation failed silently on selector: ${selector} with action: ${data.action}`);
    }
    
    // Store result in context
    context.setData(outputVariable, result);
  }
}
