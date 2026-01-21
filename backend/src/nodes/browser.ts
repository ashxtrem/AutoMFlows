import { BaseNode, OpenBrowserNodeData, NavigationNodeData, ContextManipulateNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { PlaywrightManager } from '../utils/playwright';
import { WaitHelper } from '../utils/waitHelper';
import { RetryHelper } from '../utils/retryHelper';
import { VariableInterpolator } from '../utils/variableInterpolator';
import { devices } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { resolveFromProjectRoot } from '../utils/pathUtils';

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

      // Register default context
      const browserContext = page.context();
      context.setContext('default', browserContext);
      context.setCurrentContextKey('default');
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

export class ContextManipulateHandler implements NodeHandler {
  async execute(node: BaseNode, contextManager: ContextManager): Promise<void> {
    const data = node.data as ContextManipulateNodeData;
    const playwright = (contextManager as any).playwright as PlaywrightManager;

    if (!playwright) {
      throw new Error('Playwright manager not found in context');
    }

    if (!data.action) {
      throw new Error('Action is required for Context Manipulate node');
    }

    try {
      switch (data.action) {
        case 'setGeolocation': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.geolocation || data.geolocation.latitude === undefined || data.geolocation.longitude === undefined) {
            throw new Error('Geolocation latitude and longitude are required');
          }
          await browserContext.setGeolocation({
            latitude: data.geolocation.latitude,
            longitude: data.geolocation.longitude,
            accuracy: data.geolocation.accuracy,
          });
          break;
        }

        case 'setPermissions': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.permissions || data.permissions.length === 0) {
            throw new Error('Permissions array is required');
          }
          await browserContext.grantPermissions(data.permissions);
          break;
        }

        case 'clearPermissions': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          await browserContext.clearPermissions();
          break;
        }

        case 'setViewportSize': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          if (data.viewportWidth === undefined || data.viewportHeight === undefined) {
            throw new Error('Viewport width and height are required');
          }
          await page.setViewportSize({ width: data.viewportWidth, height: data.viewportHeight });
          break;
        }

        case 'setUserAgent': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.userAgent) {
            throw new Error('User agent string is required');
          }
          await browserContext.setExtraHTTPHeaders({ 'User-Agent': data.userAgent });
          break;
        }

        case 'setLocale': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.locale) {
            throw new Error('Locale is required');
          }
          // Locale can only be set when creating context, so we need to create a new context
          const currentContext = browserContext;
          const browser = playwright.getBrowser();
          if (!browser) {
            throw new Error('Browser instance not found');
          }
          const contextOptions: any = {};
          // Copy current context options
          const currentPages = currentContext.pages();
          const newContext = await browser.newContext({ ...contextOptions, locale: data.locale });
          // Create a new page in the new context
          const newPage = await newContext.newPage();
          // Copy cookies from old context if needed
          const cookies = await currentContext.cookies();
          if (cookies.length > 0) {
            await newContext.addCookies(cookies);
          }
          // Store new context
          const contextKey = data.contextKey || 'default';
          contextManager.setContext(contextKey, newContext);
          contextManager.setCurrentContextKey(contextKey);
          contextManager.setPage(newPage);
          break;
        }

        case 'setTimezone': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.timezoneId) {
            throw new Error('Timezone ID is required');
          }
          // Timezone can only be set when creating context
          const browser = playwright.getBrowser();
          if (!browser) {
            throw new Error('Browser instance not found');
          }
          const currentContext = browserContext;
          const contextOptions: any = {};
          const newContext = await browser.newContext({ ...contextOptions, timezoneId: data.timezoneId });
          const newPage = await newContext.newPage();
          const cookies = await currentContext.cookies();
          if (cookies.length > 0) {
            await newContext.addCookies(cookies);
          }
          const contextKey = data.contextKey || 'default';
          contextManager.setContext(contextKey, newContext);
          contextManager.setCurrentContextKey(contextKey);
          contextManager.setPage(newPage);
          break;
        }

        case 'setColorScheme': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.colorScheme) {
            throw new Error('Color scheme is required');
          }
          // Color scheme can only be set when creating context
          const browser = playwright.getBrowser();
          if (!browser) {
            throw new Error('Browser instance not found');
          }
          const currentContext = browserContext;
          const contextOptions: any = {};
          const newContext = await browser.newContext({ ...contextOptions, colorScheme: data.colorScheme });
          const newPage = await newContext.newPage();
          const cookies = await currentContext.cookies();
          if (cookies.length > 0) {
            await newContext.addCookies(cookies);
          }
          const contextKey = data.contextKey || 'default';
          contextManager.setContext(contextKey, newContext);
          contextManager.setCurrentContextKey(contextKey);
          contextManager.setPage(newPage);
          break;
        }

        case 'setExtraHTTPHeaders': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.extraHTTPHeaders || Object.keys(data.extraHTTPHeaders).length === 0) {
            throw new Error('Extra HTTP headers object is required');
          }
          await browserContext.setExtraHTTPHeaders(data.extraHTTPHeaders);
          break;
        }

        case 'createContext': {
          const browser = playwright.getBrowser();
          if (!browser) {
            throw new Error('Browser must be launched before creating a context');
          }
          const contextKey = data.contextKey || `context-${Date.now()}`;
          if (contextManager.getContext(contextKey)) {
            throw new Error(`Context with key "${contextKey}" already exists`);
          }
          const contextOptions = data.contextOptions || {};
          const browserContext = await playwright.createContext(contextOptions);
          const newPage = await browserContext.newPage();
          contextManager.setContext(contextKey, browserContext);
          contextManager.setCurrentContextKey(contextKey);
          contextManager.setPage(newPage);
          break;
        }

        case 'switchContext': {
          if (!data.contextKey) {
            throw new Error('Context key is required for switchContext action');
          }
          const browserContext = contextManager.getContext(data.contextKey);
          if (!browserContext) {
            throw new Error(`Context with key "${data.contextKey}" not found`);
          }
          contextManager.setCurrentContextKey(data.contextKey);
          // Get or create a page in the switched context
          const pages = browserContext.pages();
          if (pages.length > 0) {
            contextManager.setPage(pages[0]);
          } else {
            const newPage = await browserContext.newPage();
            contextManager.setPage(newPage);
          }
          break;
        }

        case 'saveState': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.stateFilePath) {
            throw new Error('State file path is required');
          }
          const resolvedPath = resolveFromProjectRoot(data.stateFilePath);
          const dir = path.dirname(resolvedPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          await browserContext.storageState({ path: resolvedPath });
          break;
        }

        case 'loadState': {
          const browser = playwright.getBrowser();
          if (!browser) {
            throw new Error('Browser must be launched before loading state');
          }
          if (!data.stateFilePath) {
            throw new Error('State file path is required');
          }
          const resolvedPath = resolveFromProjectRoot(data.stateFilePath);
          if (!fs.existsSync(resolvedPath)) {
            throw new Error(`State file not found: ${resolvedPath}`);
          }
          const contextKey = data.contextKey || `context-${Date.now()}`;
          const browserContext = await browser.newContext({ storageState: resolvedPath });
          const newPage = await browserContext.newPage();
          contextManager.setContext(contextKey, browserContext);
          contextManager.setCurrentContextKey(contextKey);
          contextManager.setPage(newPage);
          break;
        }

        case 'emulateDevice': {
          const browser = playwright.getBrowser();
          if (!browser) {
            throw new Error('Browser must be launched before emulating device');
          }
          if (!data.device) {
            throw new Error('Device name is required');
          }
          // Get device configuration from Playwright devices
          const deviceConfig = (devices as any)[data.device];
          if (!deviceConfig) {
            throw new Error(`Device "${data.device}" not found. Available devices: ${Object.keys(devices).join(', ')}`);
          }
          const contextKey = data.contextKey || `context-${Date.now()}`;
          const browserContext = await browser.newContext(deviceConfig);
          const newPage = await browserContext.newPage();
          contextManager.setContext(contextKey, browserContext);
          contextManager.setCurrentContextKey(contextKey);
          contextManager.setPage(newPage);
          break;
        }

        case 'addInitScript': {
          const page = contextManager.getPage();
          if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
          }
          const browserContext = page.context();
          if (!data.initScript) {
            throw new Error('Init script is required');
          }
          await browserContext.addInitScript(data.initScript);
          break;
        }

        default:
          throw new Error(`Unknown action type: ${data.action}`);
      }
    } catch (error: any) {
      if (data.failSilently) {
        console.warn(`[ContextManipulateHandler] Action "${data.action}" failed silently: ${error.message}`);
        return;
      }
      throw error;
    }
  }
}
