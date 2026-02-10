import { BaseNode, FormInputNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

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

        // Scroll to element if scrollThenAction is enabled
        const scrollThenAction = context.getData('scrollThenAction');
        if (scrollThenAction && selector) {
          try {
            await LocatorHelper.scrollToElementSmooth(page, selector, data.selectorType || 'css', timeout);
          } catch (error: any) {
            // Log warning but continue execution
            console.warn(`[FormInputHandler] Failed to scroll to element before action: ${error.message}`);
          }
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
