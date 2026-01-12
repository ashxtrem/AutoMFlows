/**
 * WaitHelper utility for advanced waiting operations
 * Provides reusable wait logic for selector, URL pattern, and JavaScript conditions
 */

export interface WaitOptions {
  waitForSelector?: string;
  waitForSelectorType?: 'css' | 'xpath';
  waitForSelectorTimeout?: number;
  waitForUrl?: string;
  waitForUrlTimeout?: number;
  waitForCondition?: string;
  waitForConditionTimeout?: number;
  waitStrategy?: 'sequential' | 'parallel';
  failSilently?: boolean;
  defaultTimeout?: number;
  waitTiming?: 'before' | 'after'; // Indicates if wait is before or after operation
}

export class WaitHelper {
  /**
   * Execute all wait conditions based on the provided options
   */
  static async executeWaits(page: any, options: WaitOptions): Promise<void> {
    const {
      waitForSelector,
      waitForSelectorType,
      waitForSelectorTimeout,
      waitForUrl,
      waitForUrlTimeout,
      waitForCondition,
      waitForConditionTimeout,
      waitStrategy = 'parallel',
      failSilently = false,
      defaultTimeout = 30000,
    } = options;

    const waitPromises: Promise<void>[] = [];

    const waitTiming = options.waitTiming || 'before';

    // Wait for selector
    if (waitForSelector) {
      const selectorTimeout = waitForSelectorTimeout || defaultTimeout;
      const waitForSelectorPromise = this.waitForSelector(
        page,
        waitForSelector,
        waitForSelectorType || 'css',
        selectorTimeout,
        failSilently,
        waitTiming
      );
      waitPromises.push(waitForSelectorPromise);
    }

    // Wait for URL pattern
    if (waitForUrl) {
      const urlTimeout = waitForUrlTimeout || defaultTimeout;
      const waitForUrlPromise = this.waitForUrl(
        page,
        waitForUrl,
        urlTimeout,
        failSilently,
        waitTiming
      );
      waitPromises.push(waitForUrlPromise);
    }

    // Wait for custom JavaScript condition
    if (waitForCondition) {
      const conditionTimeout = waitForConditionTimeout || defaultTimeout;
      const waitForConditionPromise = this.waitForCondition(
        page,
        waitForCondition,
        conditionTimeout,
        failSilently,
        waitTiming
      );
      waitPromises.push(waitForConditionPromise);
    }

    // Execute wait strategy
    if (waitPromises.length > 0) {
      try {
        if (waitStrategy === 'sequential') {
          // Execute waits one after another
          for (const waitPromise of waitPromises) {
            await waitPromise;
          }
        } else {
          // Execute waits in parallel (default)
          await Promise.all(waitPromises);
        }
      } catch (error: any) {
        if (failSilently) {
          console.warn(`Advanced wait failed silently: ${error.message}`);
          return;
        }
        throw error;
      }
    }
  }

  static async waitForSelector(
    page: any,
    selector: string,
    selectorType: 'css' | 'xpath',
    timeout: number,
    failSilently: boolean,
    waitTiming: 'before' | 'after' = 'before'
  ): Promise<void> {
    const timingLabel = waitTiming === 'after' ? 'after operation' : 'before operation';
    
    if (!selector || selector.trim() === '') {
      if (failSilently) {
        console.warn(`Wait for selector skipped (${timingLabel}): selector is empty`);
        return;
      }
      throw new Error(`Wait for selector failed (${timingLabel}): selector cannot be empty`);
    }

    try {
      if (selectorType === 'xpath') {
        await page.locator(`xpath=${selector}`).waitFor({ timeout, state: 'visible' });
      } else {
        await page.waitForSelector(selector, { timeout, state: 'visible' });
      }
    } catch (error: any) {
      if (failSilently) {
        console.warn(`Wait for selector failed silently (${timingLabel}): ${selector} (${selectorType}): ${error.message}`);
        return;
      }
      const errorMessage = error.message.includes('timeout') 
        ? `Wait ${timingLabel}: Selector "${selector}" (${selectorType}) did not appear within ${timeout}ms`
        : `Wait for selector failed (${timingLabel}): ${selector} (${selectorType}): ${error.message}`;
      throw new Error(errorMessage);
    }
  }

  static async waitForUrl(
    page: any,
    urlPattern: string,
    timeout: number,
    failSilently: boolean,
    waitTiming: 'before' | 'after' = 'before'
  ): Promise<void> {
    const timingLabel = waitTiming === 'after' ? 'after operation' : 'before operation';
    
    if (!urlPattern || urlPattern.trim() === '') {
      if (failSilently) {
        console.warn(`Wait for URL pattern skipped (${timingLabel}): pattern is empty`);
        return;
      }
      throw new Error(`Wait for URL pattern failed (${timingLabel}): pattern cannot be empty`);
    }

    try {
      // Try to compile as regex first, fallback to string match
      let regex: RegExp;
      try {
        // Check if it's a regex pattern (starts and ends with /)
        if (urlPattern.startsWith('/') && urlPattern.endsWith('/')) {
          const pattern = urlPattern.slice(1, -1);
          regex = new RegExp(pattern);
        } else {
          // Treat as literal string match
          regex = new RegExp(urlPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        }
      } catch (regexError: any) {
        if (failSilently) {
          console.warn(`Invalid regex pattern "${urlPattern}" (${timingLabel}), treating as literal string: ${regexError.message}`);
          regex = new RegExp(urlPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        } else {
          throw new Error(`Invalid regex pattern "${urlPattern}" (${timingLabel}): ${regexError.message}`);
        }
      }

      await page.waitForURL(regex, { timeout });
    } catch (error: any) {
      if (failSilently) {
        console.warn(`Wait for URL pattern failed silently (${timingLabel}): ${urlPattern}: ${error.message}`);
        return;
      }
      const errorMessage = error.message.includes('timeout')
        ? `Wait ${timingLabel}: URL did not match pattern "${urlPattern}" within ${timeout}ms. Current URL: ${page.url()}`
        : `Wait for URL pattern failed (${timingLabel}): ${urlPattern}: ${error.message}`;
      throw new Error(errorMessage);
    }
  }

  static async waitForCondition(
    page: any,
    condition: string,
    timeout: number,
    failSilently: boolean,
    waitTiming: 'before' | 'after' = 'before'
  ): Promise<void> {
    const timingLabel = waitTiming === 'after' ? 'after operation' : 'before operation';
    
    if (!condition || condition.trim() === '') {
      if (failSilently) {
        console.warn(`Wait for condition skipped (${timingLabel}): condition is empty`);
        return;
      }
      throw new Error(`Wait for condition failed (${timingLabel}): condition cannot be empty`);
    }

    try {
      await page.waitForFunction(condition, { timeout });
    } catch (error: any) {
      if (failSilently) {
        console.warn(`Wait for condition failed silently (${timingLabel}): ${condition}: ${error.message}`);
        return;
      }
      let errorMessage: string;
      if (error.message.includes('timeout')) {
        errorMessage = `Wait ${timingLabel}: Condition did not evaluate to true within ${timeout}ms: ${condition}`;
      } else if (error.message.includes('SyntaxError') || error.message.includes('ReferenceError')) {
        errorMessage = `Wait ${timingLabel}: JavaScript syntax error in condition: ${condition}. Error: ${error.message}`;
      } else {
        errorMessage = `Wait for condition failed (${timingLabel}): ${condition}: ${error.message}`;
      }
      throw new Error(errorMessage);
    }
  }
}

