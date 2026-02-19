import { BaseNode, ScreenshotNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

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

    // Check if execution-specific screenshots directory is available
    const screenshotsDirectory = context.getData('screenshotsDirectory');
    if (screenshotsDirectory && playwright.setScreenshotsDirectory) {
      playwright.setScreenshotsDirectory(screenshotsDirectory);
    }

    // Execute screenshot operation with retry logic (includes wait conditions)
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
            defaultTimeout: 30000,
            waitTiming: 'before',
          }, context);
        }

        // Execute screenshot operation based on action
        const action = data.action || (data.fullPage ? 'fullPage' : 'viewport'); // Support legacy fullPage property
        let screenshotPath: string;
        
        switch (action) {
          case 'fullPage':
            screenshotPath = await playwright.takeScreenshot(data.path, true);
            break;
            
          case 'viewport':
            screenshotPath = await playwright.takeScreenshot(data.path, false);
            break;
            
          case 'element':
            if (!data.selector) {
              throw new Error('Selector is required for element screenshot action');
            }
            const selector = VariableInterpolator.interpolateString(data.selector, context);
            const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css', data.selectorModifiers);
            
            // Handle masking if specified
            // Note: mask selectors use the same selectorType as the main selector
            const maskLocators = data.mask?.map(m => {
              const maskSelector = VariableInterpolator.interpolateString(m, context);
              return LocatorHelper.createLocator(page, maskSelector, data.selectorType || 'css', data.selectorModifiers);
            });
            
            const screenshotTimeout = data.waitForSelectorTimeout || 30000;
            const screenshotOptions: any = { path: data.path, timeout: screenshotTimeout };
            if (maskLocators && maskLocators.length > 0) {
              screenshotOptions.mask = maskLocators;
            }
            
            await locator.screenshot(screenshotOptions);
            screenshotPath = data.path || 'element-screenshot.png';
            break;
            
          case 'pdf':
            if (!data.path) {
              throw new Error('Path is required for PDF generation');
            }
            const pdfPath = VariableInterpolator.interpolateString(data.path, context);
            const pdfOptions: any = {
              path: pdfPath,
              format: data.format || 'A4',
              printBackground: data.printBackground !== false,
              landscape: data.landscape || false,
            };
            if (data.margin) {
              pdfOptions.margin = data.margin;
            }
            await page.pdf(pdfOptions);
            screenshotPath = pdfPath;
            break;
            
          default:
            // Legacy: use fullPage property
            const fullPage = data.fullPage || false;
            screenshotPath = await playwright.takeScreenshot(data.path, fullPage);
            break;
        }
        
        context.setData('screenshotPath', screenshotPath);

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
            defaultTimeout: 30000,
            waitTiming: 'after',
          });
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
      throw new Error(`Screenshot operation failed silently`);
    }
  }
}
