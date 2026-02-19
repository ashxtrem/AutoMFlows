import { BaseNode, TypeNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

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

        // Scroll to element if scrollThenAction is enabled
        const scrollThenAction = context.getData('scrollThenAction');
        if (scrollThenAction && selector) {
          try {
            await LocatorHelper.scrollToElementSmooth(page, selector, data.selectorType || 'css', timeout, data.selectorModifiers);
          } catch (error: any) {
            // Log warning but continue execution
            console.warn(`[TypeHandler] Failed to scroll to element before action: ${error.message}`);
          }
        }

        // Execute type operation based on inputMethod
        const inputMethod = data.inputMethod || 'fill'; // Default to 'fill' for backward compatibility
        const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css', data.selectorModifiers);

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
      throw new Error(`Type operation failed silently on selector: ${selector}`);
    }
  }
}
