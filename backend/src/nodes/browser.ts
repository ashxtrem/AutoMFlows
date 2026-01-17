import { BaseNode, OpenBrowserNodeData, NavigationNodeData } from '@automflows/shared';
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

export class NavigationHandler implements NodeHandler {
  async execute(node: BaseNode, contextManager: ContextManager): Promise<void> {
    const data = node.data as NavigationNodeData;
    const page = contextManager.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Navigation node');
    }

    const timeout = data.timeout || 30000;

    // Execute navigation operation with retry logic (includes wait conditions)
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
          }, contextManager);
        }

        // Execute action based on action type
        switch (data.action) {
          case 'navigate':
            if (!data.url) {
              throw new Error('URL is required for navigate action');
            }
            // Interpolate variables in URL
            let url = VariableInterpolator.interpolateString(data.url, contextManager);
            // Normalize URL - add https:// if no protocol is specified
            url = url.trim();
            if (!url.match(/^https?:\/\//i)) {
              url = `https://${url}`;
            }
            const waitUntil = data.waitUntil || 'networkidle';
            const gotoOptions: any = { waitUntil, timeout };
            if (data.referer) {
              gotoOptions.referer = VariableInterpolator.interpolateString(data.referer, contextManager);
            }
            await page.goto(url, gotoOptions);
            break;

          case 'goBack':
            const backWaitUntil = data.waitUntil || 'networkidle';
            await page.goBack({ waitUntil: backWaitUntil, timeout });
            break;

          case 'goForward':
            const forwardWaitUntil = data.waitUntil || 'networkidle';
            await page.goForward({ waitUntil: forwardWaitUntil, timeout });
            break;

          case 'reload':
            const reloadWaitUntil = data.waitUntil || 'networkidle';
            await page.reload({ waitUntil: reloadWaitUntil, timeout });
            break;

          case 'newTab':
            // Get browser context from current page
            const newTabBrowserContext = page.context();
            const newPage = await newTabBrowserContext.newPage();
            const contextKey = data.contextKey || 'newPage';
            
            if (data.url) {
              // Interpolate variables in URL
              let newTabUrl = VariableInterpolator.interpolateString(data.url, contextManager);
              // Normalize URL
              newTabUrl = newTabUrl.trim();
              if (!newTabUrl.match(/^https?:\/\//i)) {
                newTabUrl = `https://${newTabUrl}`;
              }
              const newTabWaitUntil = data.waitUntil || 'networkidle';
              await newPage.goto(newTabUrl, { waitUntil: newTabWaitUntil, timeout });
            }
            // Store new page reference in context
            contextManager.setData(contextKey, newPage);
            break;

          case 'switchTab':
            // Get all pages from the current browser context
            const switchTabBrowserContext = page.context();
            const pages = switchTabBrowserContext.pages();
            let targetPage: any = null;
            
            if (data.tabIndex !== undefined) {
              // Switch by index
              if (data.tabIndex >= 0 && data.tabIndex < pages.length) {
                targetPage = pages[data.tabIndex];
              } else {
                throw new Error(`Tab index ${data.tabIndex} is out of range. Available tabs: ${pages.length}`);
              }
            } else if (data.urlPattern) {
              // Switch by URL pattern
              const pattern = VariableInterpolator.interpolateString(data.urlPattern, contextManager);
              const regex = pattern.startsWith('/') && pattern.endsWith('/')
                ? new RegExp(pattern.slice(1, -1))
                : new RegExp(pattern);
              
              for (const p of pages) {
                const url = p.url();
                if (regex.test(url)) {
                  targetPage = p;
                  break;
                }
              }
              
              if (!targetPage) {
                throw new Error(`No tab found matching URL pattern: ${pattern}`);
              }
            } else {
              // Default: switch to first available tab (other than current)
              if (pages.length > 1) {
                targetPage = pages.find((p: any) => p !== page) || pages[0];
              } else {
                throw new Error('No other tabs available to switch to');
              }
            }
            
            // Switch context to target page
            contextManager.setPage(targetPage);
            const switchContextKey = data.contextKey || 'currentPage';
            contextManager.setData(switchContextKey, targetPage);
            break;

          case 'closeTab':
            // Get all pages from the current browser context
            const closeTabBrowserContext = page.context();
            const allPages = closeTabBrowserContext.pages();
            let pageToClose: any = null;
            
            if (data.tabIndex !== undefined) {
              // Close by index
              if (data.tabIndex >= 0 && data.tabIndex < allPages.length) {
                pageToClose = allPages[data.tabIndex];
              } else {
                throw new Error(`Tab index ${data.tabIndex} is out of range. Available tabs: ${allPages.length}`);
              }
            } else {
              // Close current page
              pageToClose = page;
            }
            
            await pageToClose.close();
            
            // If we closed the current page, switch to another page if available
            if (pageToClose === page) {
              const remainingPages = closeTabBrowserContext.pages();
              if (remainingPages.length > 0) {
                contextManager.setPage(remainingPages[0]);
              }
            }
            break;

          default:
            throw new Error(`Unknown action type: ${data.action}`);
        }

        // Execute waits after operation if waitAfterOperation is true
        if (waitAfterOperation) {
          const currentPage = contextManager.getPage();
          if (currentPage) {
            await WaitHelper.executeWaits(currentPage, {
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
            }, contextManager);
          }
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
      throw new Error(`Navigation operation failed silently with action: ${data.action}`);
    }
  }
}
