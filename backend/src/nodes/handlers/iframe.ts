import { BaseNode, IframeNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

export class IframeHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as IframeNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Iframe node');
    }

    const timeout = data.timeout || 30000;

    // Execute iframe operation with retry logic (includes wait conditions)
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
          case 'switchToIframe':
            let frame: any = null;
            
            if (data.selector) {
              const selector = VariableInterpolator.interpolateString(data.selector, context);
              // IframeNodeData doesn't have selectorType, default to CSS
              const locator = LocatorHelper.createLocator(page, selector, 'css');
              frame = await locator.contentFrame();
            } else if (data.name) {
              const name = VariableInterpolator.interpolateString(data.name, context);
              frame = page.frame({ name });
            } else if (data.url) {
              const urlPattern = VariableInterpolator.interpolateString(data.url, context);
              const regex = urlPattern.startsWith('/') && urlPattern.endsWith('/')
                ? new RegExp(urlPattern.slice(1, -1))
                : new RegExp(urlPattern);
              frame = page.frames().find((f: any) => regex.test(f.url()));
            } else {
              // Default: get first iframe
              const frames = page.frames();
              frame = frames.length > 1 ? frames[1] : null; // frames[0] is main frame
            }
            
            if (!frame) {
              throw new Error('Iframe not found');
            }
            
            const contextKey = data.contextKey || 'iframePage';
            context.setData(contextKey, frame);
            // Note: Playwright doesn't have a direct "switch context" - we store frame reference
            // Subsequent operations on this frame should use the stored frame reference
            break;

          case 'switchToMainFrame':
            // Switch back to main frame (just clear iframe reference)
            context.setData('iframePage', undefined);
            break;

          case 'getIframeContent':
            if (!data.iframeSelector || !data.contentSelector) {
              throw new Error('Iframe selector and content selector are required for getIframeContent action');
            }
            const iframeSelector = VariableInterpolator.interpolateString(data.iframeSelector, context);
            const contentSelector = VariableInterpolator.interpolateString(data.contentSelector, context);
            // IframeNodeData doesn't have selectorType, default to CSS
            const iframeLocator = LocatorHelper.createLocator(page, iframeSelector, 'css');
            const iframeFrame = await iframeLocator.contentFrame();
            
            if (!iframeFrame) {
              throw new Error('Iframe not found');
            }
            
            // Content selector within iframe uses CSS (iframeFrame.locator only supports CSS/XPath)
            // For Playwright locator methods, we'd need to use iframeFrame.getByRole, etc.
            // For now, support CSS/XPath only for content within iframe
            const contentLocator = contentSelector.startsWith('xpath=') || contentSelector.startsWith('//')
              ? iframeFrame.locator(`xpath=${contentSelector}`)
              : iframeFrame.locator(contentSelector);
            const content = await contentLocator.textContent({ timeout });
            const outputVar = data.outputVariable || 'iframeContent';
            context.setData(outputVar, content);
            break;

          default:
            throw new Error(`Unknown iframe action type: ${data.action}`);
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
      throw new Error(`Iframe operation failed silently with action: ${data.action}`);
    }
  }
}
