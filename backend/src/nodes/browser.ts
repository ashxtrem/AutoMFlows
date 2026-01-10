import { BaseNode, NodeType, OpenBrowserNodeData, NavigateNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { PlaywrightManager } from '../utils/playwright';
import { WaitHelper } from '../utils/waitHelper';
import { RetryHelper } from '../utils/retryHelper';
import { VariableInterpolator } from '../utils/variableInterpolator';

export class OpenBrowserHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as OpenBrowserNodeData;
    const playwright = (context as any).playwright as PlaywrightManager;

    if (!playwright) {
      throw new Error('Playwright manager not found in context');
    }

    const headless = data.headless !== false; // Default to headless
    const viewport = data.viewportWidth && data.viewportHeight
      ? { width: data.viewportWidth, height: data.viewportHeight }
      : undefined;
    const jsScript = data.jsScript;
    const browserType = data.browser || 'chromium';
    const maxWindow = data.maxWindow !== false; // Default to true
    const capabilities = data.capabilities || {};
    const launchOptions = data.launchOptions || {};
    const stealthMode = data.stealthMode || false;

    try {
      const page = await playwright.launch(
        headless,
        viewport,
        browserType,
        maxWindow,
        capabilities,
        stealthMode,
        launchOptions,
        jsScript
      );

      context.setPage(page);
    } catch (error: any) {
      // Re-throw with browser installation info if it's a browser installation error
      if (error.message.includes('is not installed')) {
        throw error;
      }
      throw error;
    }
  }
}

export class NavigateHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as NavigateNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.url) {
      throw new Error('URL is required for Navigate node');
    }

    // Interpolate variables in URL
    let url = VariableInterpolator.interpolateString(data.url, context);

    // Normalize URL - add https:// if no protocol is specified
    url = url.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }

    // Prepare navigation options
    const timeout = data.timeout || 30000;
    const waitUntil = data.waitUntil || 'networkidle';
    const gotoOptions: any = {
      waitUntil,
      timeout,
    };

    if (data.referer) {
      gotoOptions.referer = data.referer;
    }

    // Execute navigation with retry logic (includes wait conditions)
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

        // Execute navigation
        await page.goto(url, gotoOptions);

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
      throw new Error(`Navigation operation failed silently to URL: ${url}`);
    }
  }
}

