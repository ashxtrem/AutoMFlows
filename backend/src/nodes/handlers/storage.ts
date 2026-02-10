import { BaseNode, StorageNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';

export class StorageHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as StorageNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Storage node');
    }

    const timeout = data.waitForSelectorTimeout || 30000;
    const contextKey = data.contextKey || 'storageResult';

    // Execute storage operation with retry logic (includes wait conditions)
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

        let storageResult: any;

        // Execute action based on action type
        switch (data.action) {
          case 'getCookie':
            if (data.name) {
              const name = VariableInterpolator.interpolateString(data.name, context);
              const cookies = await page.context().cookies(data.url ? VariableInterpolator.interpolateString(data.url, context) : undefined);
              const cookie = cookies.find((c: any) => c.name === name);
              storageResult = cookie ? cookie.value : null;
            } else {
              const url = data.url ? VariableInterpolator.interpolateString(data.url, context) : undefined;
              storageResult = await page.context().cookies(url);
            }
            break;

          case 'setCookie':
            if (!data.cookies || !Array.isArray(data.cookies)) {
              throw new Error('Cookies array is required for setCookie action');
            }
            const url = data.url ? VariableInterpolator.interpolateString(data.url, context) : page.url();
            const cookiesToSet = data.cookies.map(cookie => ({
              name: VariableInterpolator.interpolateString(cookie.name, context),
              value: VariableInterpolator.interpolateString(cookie.value, context),
              domain: cookie.domain ? VariableInterpolator.interpolateString(cookie.domain, context) : undefined,
              path: cookie.path,
              expires: cookie.expires,
              httpOnly: cookie.httpOnly,
              secure: cookie.secure,
              sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
              url: url,
            }));
            await page.context().addCookies(cookiesToSet);
            storageResult = cookiesToSet;
            break;

          case 'clearCookies':
            if (data.domain) {
              const domain = VariableInterpolator.interpolateString(data.domain, context);
              const cookies = await page.context().cookies();
              const cookiesToDelete = cookies.filter((c: any) => c.domain === domain || c.domain?.endsWith(`.${domain}`));
              await page.context().clearCookies();
              // Re-add cookies not matching domain
              const cookiesToKeep = cookies.filter((c: any) => !cookiesToDelete.includes(c));
              if (cookiesToKeep.length > 0) {
                await page.context().addCookies(cookiesToKeep);
              }
              storageResult = { deleted: cookiesToDelete.length, kept: cookiesToKeep.length };
            } else {
              await page.context().clearCookies();
              storageResult = { deleted: 'all' };
            }
            break;

          case 'getLocalStorage':
            if (data.key) {
              const key = VariableInterpolator.interpolateString(data.key, context);
              storageResult = await page.evaluate((k: string) => localStorage.getItem(k), key);
            } else {
              storageResult = await page.evaluate(() => {
                const items: Record<string, string> = {};
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key) {
                    items[key] = localStorage.getItem(key) || '';
                  }
                }
                return items;
              });
            }
            break;

          case 'setLocalStorage':
            if (!data.key || data.value === undefined) {
              throw new Error('Key and value are required for setLocalStorage action');
            }
            const setKey = VariableInterpolator.interpolateString(data.key, context);
            const setValue = VariableInterpolator.interpolateString(String(data.value), context);
            await page.evaluate((k: string, v: string) => localStorage.setItem(k, v), setKey, setValue);
            storageResult = { key: setKey, value: setValue };
            break;

          case 'clearLocalStorage':
            await page.evaluate(() => localStorage.clear());
            storageResult = { cleared: true };
            break;

          case 'getSessionStorage':
            if (data.key) {
              const key = VariableInterpolator.interpolateString(data.key, context);
              storageResult = await page.evaluate((k: string) => sessionStorage.getItem(k), key);
            } else {
              storageResult = await page.evaluate(() => {
                const items: Record<string, string> = {};
                for (let i = 0; i < sessionStorage.length; i++) {
                  const key = sessionStorage.key(i);
                  if (key) {
                    items[key] = sessionStorage.getItem(key) || '';
                  }
                }
                return items;
              });
            }
            break;

          case 'setSessionStorage':
            if (!data.key || data.value === undefined) {
              throw new Error('Key and value are required for setSessionStorage action');
            }
            const sessionKey = VariableInterpolator.interpolateString(data.key, context);
            const sessionValue = VariableInterpolator.interpolateString(String(data.value), context);
            await page.evaluate((k: string, v: string) => sessionStorage.setItem(k, v), sessionKey, sessionValue);
            storageResult = { key: sessionKey, value: sessionValue };
            break;

          case 'clearSessionStorage':
            await page.evaluate(() => sessionStorage.clear());
            storageResult = { cleared: true };
            break;

          default:
            throw new Error(`Unknown storage action type: ${data.action}`);
        }

        // Store result in context
        context.setData(contextKey, storageResult);

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
      throw new Error(`Storage operation failed silently with action: ${data.action}`);
    }
  }
}
