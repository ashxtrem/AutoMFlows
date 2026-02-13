/**
 * WaitHelper utility for advanced waiting operations
 * Provides reusable wait logic for selector, URL pattern, and JavaScript conditions
 */

import { ContextManager } from '../engine/context';
import { VariableInterpolator } from './variableInterpolator';
import { LocatorHelper } from './locatorHelper';
import { SelectorType } from '@automflows/shared';

export interface WaitOptions {
  waitForSelector?: string;
  waitForSelectorType?: SelectorType;
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
   * @param page - Playwright page object
   * @param options - Wait options configuration
   * @param context - Optional ContextManager for variable interpolation and traceLog access
   */
  static async executeWaits(page: any, options: WaitOptions, context?: ContextManager): Promise<void> {
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

    // Wait for selector - interpolate variables if context is provided
    if (waitForSelector) {
      const selectorTimeout = waitForSelectorTimeout || defaultTimeout;
      const interpolatedSelector = context 
        ? VariableInterpolator.interpolateString(waitForSelector, context)
        : waitForSelector;
      const waitForSelectorPromise = this.waitForSelector(
        page,
        interpolatedSelector,
        waitForSelectorType || 'css',
        selectorTimeout,
        failSilently,
        waitTiming,
        context
      );
      waitPromises.push(waitForSelectorPromise);
    }

    // Wait for URL pattern - interpolate variables if context is provided
    if (waitForUrl) {
      const urlTimeout = waitForUrlTimeout || defaultTimeout;
      const interpolatedUrl = context 
        ? VariableInterpolator.interpolateString(waitForUrl, context)
        : waitForUrl;
      const waitForUrlPromise = this.waitForUrl(
        page,
        interpolatedUrl,
        urlTimeout,
        failSilently,
        waitTiming,
        context
      );
      waitPromises.push(waitForUrlPromise);
    }

    // Wait for custom JavaScript condition - interpolate variables if context is provided
    if (waitForCondition) {
      const conditionTimeout = waitForConditionTimeout || defaultTimeout;
      const interpolatedCondition = context 
        ? VariableInterpolator.interpolateString(waitForCondition, context)
        : waitForCondition;
      const waitForConditionPromise = this.waitForCondition(
        page,
        interpolatedCondition,
        conditionTimeout,
        failSilently,
        waitTiming,
        context
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
    selectorType: SelectorType | string,
    timeout: number,
    failSilently: boolean,
    waitTiming: 'before' | 'after' = 'before',
    context?: ContextManager
  ): Promise<void> {
    const timingLabel = waitTiming === 'after' ? 'after operation' : 'before operation';
    const traceLog = context?.getData('traceLog') as ((message: string) => void) | undefined;
    const log = traceLog || console.log;
    
    if (!selector || selector.trim() === '') {
      if (failSilently) {
        console.warn(`Wait for selector skipped (${timingLabel}): selector is empty`);
        return;
      }
      throw new Error(`Wait for selector failed (${timingLabel}): selector cannot be empty`);
    }

    try {
      const locator = LocatorHelper.createLocator(page, selector, selectorType || 'css');
      const element = locator.first();
      
      // Log initial state
      try {
        const isVisible = await element.isVisible().catch(() => false);
        const actualState = isVisible ? 'visible' : 'invisible';
        log(`Wait [selector]: selector: ${selector} | expected: visible | got: ${actualState} | timeout: ${timeout}ms`);
      } catch {
        // If we can't check visibility, log anyway
        log(`Wait [selector]: selector: ${selector} | expected: visible | got: checking... | timeout: ${timeout}ms`);
      }
      
      await locator.waitFor({ timeout, state: 'visible' });
    } catch (error: any) {
      // Log final state on timeout
      if (error.message.includes('timeout')) {
        try {
          const locator = LocatorHelper.createLocator(page, selector, selectorType || 'css');
          const element = locator.first();
          const isVisible = await element.isVisible().catch(() => false);
          const actualState = isVisible ? 'visible' : 'invisible';
          log(`Wait [selector]: selector: ${selector} | expected: visible | got: ${actualState} | timeout: ${timeout}ms (TIMEOUT)`);
        } catch {
          log(`Wait [selector]: selector: ${selector} | expected: visible | got: timeout | timeout: ${timeout}ms (TIMEOUT)`);
        }
      }
      
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
    waitTiming: 'before' | 'after' = 'before',
    context?: ContextManager
  ): Promise<void> {
    const timingLabel = waitTiming === 'after' ? 'after operation' : 'before operation';
    const traceLog = context?.getData('traceLog') as ((message: string) => void) | undefined;
    const log = traceLog || console.log;
    
    if (!urlPattern || urlPattern.trim() === '') {
      if (failSilently) {
        console.warn(`Wait for URL pattern skipped (${timingLabel}): pattern is empty`);
        return;
      }
      throw new Error(`Wait for URL pattern failed (${timingLabel}): pattern cannot be empty`);
    }

    try {
      // Log initial state
      const currentUrl = page.url();
      const truncatedUrl = this.truncateString(currentUrl, 100);
      log(`Wait [url]: pattern: ${urlPattern} | got: ${truncatedUrl} | timeout: ${timeout}ms`);
      
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
      // Log final state on timeout
      if (error.message.includes('timeout')) {
        const currentUrl = page.url();
        const truncatedUrl = this.truncateString(currentUrl, 100);
        log(`Wait [url]: pattern: ${urlPattern} | got: ${truncatedUrl} | timeout: ${timeout}ms (TIMEOUT)`);
      }
      
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
    waitTiming: 'before' | 'after' = 'before',
    context?: ContextManager
  ): Promise<void> {
    const timingLabel = waitTiming === 'after' ? 'after operation' : 'before operation';
    const traceLog = context?.getData('traceLog') as ((message: string) => void) | undefined;
    const log = traceLog || console.log;
    
    if (!condition || condition.trim() === '') {
      if (failSilently) {
        console.warn(`Wait for condition skipped (${timingLabel}): condition is empty`);
        return;
      }
      throw new Error(`Wait for condition failed (${timingLabel}): condition cannot be empty`);
    }

    try {
      // Log initial state
      let currentResult = false;
      try {
        currentResult = await page.evaluate(condition);
      } catch {
        // If evaluation fails, log anyway
      }
      const truncatedCondition = this.truncateString(condition, 100);
      log(`Wait [condition]: expression: ${truncatedCondition} | result: ${currentResult} | timeout: ${timeout}ms`);
      
      await page.waitForFunction(condition, { timeout });
    } catch (error: any) {
      // Log final state on timeout
      if (error.message.includes('timeout')) {
        let currentResult = false;
        try {
          currentResult = await page.evaluate(condition);
        } catch {
          // If evaluation fails, use false
        }
        const truncatedCondition = this.truncateString(condition, 100);
        log(`Wait [condition]: expression: ${truncatedCondition} | result: ${currentResult} | timeout: ${timeout}ms (TIMEOUT)`);
      }
      
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

  /**
   * Truncate string if too long
   */
  private static truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}

