/**
 * RetryHelper utility for retry operations
 * Provides retry logic with count-based and condition-based strategies
 */

import { MatchType, SelectorType, SelectorModifiers } from '@automflows/shared';
import { ContextManager } from '../engine/context';
import { LocatorHelper } from './locatorHelper';
import { VariableInterpolator } from './variableInterpolator';

// Input type that accepts string | number for numeric fields (before interpolation)
export interface RetryOptionsInput {
  enabled: boolean;
  strategy: 'count' | 'untilCondition';
  count?: number | string; // For count strategy (can be string for interpolation)
  untilCondition?: {
    type: 'selector' | 'url' | 'javascript' | 'api-status' | 'api-json-path' | 'api-javascript';
    value?: string; // Optional, used for javascript and api-javascript
    selectorType?: SelectorType;
    selectorModifiers?: SelectorModifiers;
    visibility?: 'visible' | 'invisible';
    timeout?: number | string; // Max time to retry (can be string for interpolation)
    // API-specific fields
    expectedStatus?: number | string; // For api-status (can be string for interpolation)
    jsonPath?: string; // For api-json-path
    expectedValue?: any; // For api-json-path
    matchType?: MatchType; // For api-json-path
    contextKey?: string; // For api-javascript (which API response to check)
  };
  delay?: number | string; // Base delay in ms (can be string for interpolation)
  delayStrategy?: 'fixed' | 'exponential';
  maxDelay?: number | string; // Max delay for exponential (optional, can be string for interpolation)
  failSilently?: boolean;
  context?: ContextManager; // Context for API condition checking and traceLog access
}

// Final type after interpolation (all numeric fields are numbers)
export interface RetryOptions {
  enabled: boolean;
  strategy: 'count' | 'untilCondition';
  count?: number; // For count strategy
  untilCondition?: {
    type: 'selector' | 'url' | 'javascript' | 'api-status' | 'api-json-path' | 'api-javascript';
    value?: string; // Optional, used for javascript and api-javascript
    selectorType?: SelectorType;
    selectorModifiers?: SelectorModifiers;
    visibility?: 'visible' | 'invisible';
    timeout?: number; // Max time to retry
    // API-specific fields
    expectedStatus?: number; // For api-status
    jsonPath?: string; // For api-json-path
    expectedValue?: any; // For api-json-path
    matchType?: MatchType; // For api-json-path
    contextKey?: string; // For api-javascript (which API response to check)
  };
  delay?: number; // Base delay in ms
  delayStrategy?: 'fixed' | 'exponential';
  maxDelay?: number; // Max delay for exponential (optional)
  failSilently?: boolean;
  context?: ContextManager; // Context for API condition checking and traceLog access
}

export class RetryHelper {
  /**
   * Interpolate a numeric value from string or number
   * Supports variable interpolation: ${variables.key} or ${data.key}
   * 
   * @param value - Value to interpolate (number | string | undefined)
   * @param context - ContextManager instance for variable resolution
   * @param defaultValue - Default value if undefined or invalid
   * @returns Interpolated and parsed number
   */
  static interpolateNumericValue(
    value: number | string | undefined,
    context: ContextManager,
    defaultValue: number
  ): number {
    if (value === undefined || value === null) {
      return defaultValue;
    }

    // If it's already a number, return as-is
    if (typeof value === 'number') {
      return value;
    }

    // If it's a string, check for interpolation
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return defaultValue;
      }

      // Check if it contains interpolation pattern
      if (trimmed.includes('${')) {
        // Interpolate the string
        const interpolated = VariableInterpolator.interpolateString(trimmed, context);
        // Parse as integer (for retryCount) or float (for delays/timeouts)
        const parsed = parseFloat(interpolated);
        return isNaN(parsed) ? defaultValue : parsed;
      } else {
        // No interpolation, parse directly
        const parsed = parseFloat(trimmed);
        return isNaN(parsed) ? defaultValue : parsed;
      }
    }

    return defaultValue;
  }

  /**
   * Interpolate retry options, converting string values with interpolation to numbers
   * 
   * @param options - RetryOptionsInput with potentially string values for numeric fields
   * @param context - ContextManager instance for variable resolution
   * @returns RetryOptions with all numeric fields interpolated and converted to numbers
   */
  static interpolateRetryOptions(
    options: RetryOptionsInput,
    context: ContextManager
  ): RetryOptions {
    // Interpolate top-level numeric fields
    const interpolatedCount = options.count !== undefined
      ? this.interpolateNumericValue(options.count as any, context, 3)
      : undefined;

    const interpolatedDelay = options.delay !== undefined
      ? this.interpolateNumericValue(options.delay as any, context, 1000)
      : undefined;

    const interpolatedMaxDelay = options.maxDelay !== undefined
      ? this.interpolateNumericValue(options.maxDelay as any, context, undefined as any)
      : undefined;

    // Interpolate untilCondition fields if present
    let interpolatedUntilCondition: RetryOptions['untilCondition'] = undefined;
    if (options.untilCondition) {
      // Interpolate expectedValue if it's a string (for api-json-path conditions)
      let interpolatedExpectedValue = options.untilCondition.expectedValue;
      if (typeof interpolatedExpectedValue === 'string' && interpolatedExpectedValue.includes('${')) {
        interpolatedExpectedValue = VariableInterpolator.interpolateString(interpolatedExpectedValue, context);
      }

      interpolatedUntilCondition = {
        type: options.untilCondition.type,
        value: options.untilCondition.value,
        selectorType: options.untilCondition.selectorType,
        selectorModifiers: options.untilCondition.selectorModifiers,
        visibility: options.untilCondition.visibility,
        timeout: options.untilCondition.timeout !== undefined
          ? this.interpolateNumericValue(options.untilCondition.timeout as any, context, 30000)
          : undefined,
        expectedStatus: options.untilCondition.expectedStatus !== undefined
          ? this.interpolateNumericValue(options.untilCondition.expectedStatus as any, context, undefined as any)
          : undefined,
        jsonPath: options.untilCondition.jsonPath,
        expectedValue: interpolatedExpectedValue,
        matchType: options.untilCondition.matchType,
        contextKey: options.untilCondition.contextKey,
      };
    }

    return {
      enabled: options.enabled,
      strategy: options.strategy,
      count: interpolatedCount,
      delay: interpolatedDelay,
      delayStrategy: options.delayStrategy,
      maxDelay: interpolatedMaxDelay,
      failSilently: options.failSilently,
      context: options.context,
      untilCondition: interpolatedUntilCondition,
    };
  }

  /**
   * Execute an operation with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    page?: any
  ): Promise<T> {
    if (!options.enabled) {
      // When retry is disabled, still handle failSilently
      try {
        return await operation();
      } catch (error: any) {
        if (options.failSilently) {
          console.warn(`Operation failed silently: ${error.message}`);
          return undefined as T;
        }
        throw error;
      }
    }

    if (options.strategy === 'count') {
      return this.retryWithCount(operation, options);
    } else if (options.strategy === 'untilCondition') {
      // Check if this is an API condition (doesn't need page)
      const isApiCondition = options.untilCondition?.type?.startsWith('api-');
      if (!isApiCondition && !page) {
        throw new Error('Page is required for browser-based retry until condition strategy');
      }
      if (isApiCondition && !options.context) {
        throw new Error('Context is required for API retry until condition strategy');
      }
      return this.retryUntilCondition(operation, options, page);
    } else {
      throw new Error(`Invalid retry strategy: ${options.strategy}`);
    }
  }

  /**
   * Retry operation a fixed number of times
   */
  private static async retryWithCount<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const retryCount = options.count || 3;
    const delay = options.delay || 1000;
    const delayStrategy = options.delayStrategy || 'fixed';
    const maxDelay = options.maxDelay;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // If this is the last attempt, break
        if (attempt >= retryCount) {
          break;
        }

        // Calculate delay for next retry
        const retryDelay = this.calculateDelay(attempt + 1, delay, delayStrategy, maxDelay);
        console.log(`Retry attempt ${attempt + 1}/${retryCount} failed: ${error.message}. Retrying in ${retryDelay}ms...`);

        // Wait before retrying
        await this.sleep(retryDelay);
      }
    }

    // All retries exhausted
    if (options.failSilently) {
      console.warn(`Operation failed after ${retryCount} retries: ${lastError?.message}`);
      return undefined as T;
    }
    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Retry operation until condition is met
   */
  private static async retryUntilCondition<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    page: any
  ): Promise<T> {
    if (!options.untilCondition) {
      throw new Error('untilCondition is required for retry until condition strategy');
    }

    const condition = options.untilCondition;
    const timeout = condition.timeout || 30000;
    const delay = options.delay || 1000;
    const delayStrategy = options.delayStrategy || 'fixed';
    const maxDelay = options.maxDelay;
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (true) {
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        if (options.failSilently) {
          console.warn(`Retry until condition timed out after ${timeout}ms: ${lastError?.message || 'Condition not met'}`);
          return undefined as T;
        }
        throw new Error(`Retry until condition timed out after ${timeout}ms: ${lastError?.message || 'Condition not met'}`);
      }

      try {
        // Execute operation
        const result = await operation();
        attempt++;

        // Check if condition is met
        const isApiCondition = condition.type?.startsWith('api-');
        const conditionResult = isApiCondition 
          ? await this.checkApiConditionWithDetails(options.context!, condition as any)
          : await this.checkConditionWithDetails(page, condition as any);
        
        if (conditionResult.met) {
          return result;
        }

        // Condition not met, retry with detailed logging
        const retryDelay = this.calculateDelay(attempt, delay, delayStrategy, maxDelay);
        const conditionDetails = conditionResult.details || 'Condition not met';
        const traceLog = options.context?.getData('traceLog') as ((message: string) => void) | undefined;
        const log = traceLog || console.log;
        log(`Retry [${attempt}]: ${conditionDetails} | Retrying in ${retryDelay}ms...`);

        // Check if we have enough time left
        if (elapsed + retryDelay >= timeout) {
          if (options.failSilently) {
            console.warn(`Retry until condition timed out: Condition not met after ${attempt} attempts`);
            return undefined as T;
          }
          throw new Error(`Retry until condition timed out: Condition not met after ${attempt} attempts`);
        }

        await this.sleep(retryDelay);
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Check if condition is met despite error
        try {
          const isApiCondition = condition.type?.startsWith('api-');
          const conditionResult = isApiCondition 
            ? await this.checkApiConditionWithDetails(options.context!, condition as any)
            : await this.checkConditionWithDetails(page, condition as any);
          if (conditionResult.met) {
            return undefined as T; // Condition met but operation failed
          }
        } catch (conditionError) {
          // Condition check failed, continue retrying
        }

        // Calculate delay
        const retryDelay = this.calculateDelay(attempt, delay, delayStrategy, maxDelay);
        const elapsed = Date.now() - startTime;

        // Check timeout
        if (elapsed + retryDelay >= timeout) {
          if (options.failSilently) {
            console.warn(`Retry until condition timed out after ${timeout}ms: ${error.message}`);
            return undefined as T;
          }
          throw error;
        }

        console.log(`Retry attempt ${attempt} failed: ${error.message}. Retrying in ${retryDelay}ms...`);
        await this.sleep(retryDelay);
      }
    }
  }

  /**
   * Check if condition is met (browser-based conditions) and return details for logging
   */
  private static async checkConditionWithDetails(
    page: any,
    condition: { type: 'selector' | 'url' | 'javascript'; value: string; selectorType?: SelectorType; selectorModifiers?: SelectorModifiers; visibility?: 'visible' | 'invisible' }
  ): Promise<{ met: boolean; details?: string }> {
    try {
      if (condition.type === 'selector') {
        const selectorType = condition.selectorType || 'css';
        const visibility = condition.visibility || 'visible';
        const isInvisible = visibility === 'invisible';

        const locator = LocatorHelper.createLocator(page, condition.value, selectorType, condition.selectorModifiers);
        const isVisible = await locator.isVisible().catch(() => false);
        const met = isInvisible ? !isVisible : isVisible;
        const actualState = isVisible ? 'visible' : 'invisible';
        const details = `${condition.type} | selector: ${condition.value} | expected: ${visibility} | got: ${actualState}`;
        return { met, details };
      } else if (condition.type === 'url') {
        const currentUrl = page.url();
        let met = false;
        // Try to compile as regex first, fallback to string match
        try {
          let regex: RegExp;
          if (condition.value.startsWith('/') && condition.value.endsWith('/')) {
            const pattern = condition.value.slice(1, -1);
            regex = new RegExp(pattern);
          } else {
            regex = new RegExp(condition.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          }
          met = regex.test(currentUrl);
        } catch {
          met = currentUrl.includes(condition.value);
        }
        const details = `${condition.type} | pattern: ${condition.value} | got: ${this.truncateString(currentUrl, 100)}`;
        return { met, details };
      } else if (condition.type === 'javascript') {
        const result = await page.evaluate(condition.value);
        const boolResult = !!result;
        const details = `${condition.type} | expression: ${this.truncateString(condition.value, 100)} | result: ${boolResult}`;
        return { met: boolResult, details };
      }
      return { met: false, details: 'Unknown condition type' };
    } catch (error: any) {
      return { met: false, details: `Error: ${error.message}` };
    }
  }


  /**
   * Check if API condition is met and return details for logging
   */
  private static async checkApiConditionWithDetails(
    context: ContextManager,
    condition: {
      type: 'api-status' | 'api-json-path' | 'api-javascript';
      value?: string;
      expectedStatus?: number;
      jsonPath?: string;
      expectedValue?: any;
      matchType?: MatchType;
      contextKey?: string;
    }
  ): Promise<{ met: boolean; details?: string }> {
    try {
      // Get the API response from context
      // For api-javascript, use the specified contextKey, otherwise use default
      const contextKey = condition.contextKey || 'apiResponse';
      const apiResponse = context.getData(contextKey);

      if (!apiResponse) {
        // API response not found, condition not met
        return { met: false, details: 'API response not found' };
      }

      if (condition.type === 'api-status') {
        // Check if status code matches expected status
        if (condition.expectedStatus === undefined || condition.expectedStatus === null) {
          return { met: false, details: 'Expected status not specified' };
        }
        const actualStatus = apiResponse.status;
        const met = actualStatus === condition.expectedStatus;
        const details = `${condition.type} | expected: ${condition.expectedStatus} | equals | got: ${actualStatus}`;
        return { met, details };
      } else if (condition.type === 'api-json-path') {
        // Check if JSON path matches expected value
        if (!condition.jsonPath || condition.expectedValue === undefined) {
          return { met: false, details: 'JSON path or expected value not specified' };
        }

        const actualValue = this.getNestedValue(apiResponse.body, condition.jsonPath);
        if (actualValue === undefined) {
          const expectedStr = this.formatValue(condition.expectedValue);
          const details = `${condition.type} | jsonPath: ${condition.jsonPath} | expected: ${expectedStr} | got: undefined`;
          return { met: false, details };
        }

        const matchType = condition.matchType || 'equals';
        const met = this.matchValue(actualValue, condition.expectedValue, matchType);
        const expectedStr = this.formatValue(condition.expectedValue);
        const actualStr = this.formatValue(actualValue);
        const details = `${condition.type} | expected: ${expectedStr} | ${matchType} | got: ${actualStr}`;
        return { met, details };
      } else if (condition.type === 'api-javascript') {
        // Execute JavaScript with API response context
        if (!condition.value) {
          return { met: false, details: 'JavaScript expression not specified' };
        }

        try {
          // Create a safe execution context with API response
          const response = apiResponse;
          const contextData = {
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              body: response.body,
              duration: response.duration,
              timestamp: response.timestamp,
            },
            context: {
              data: context.getAllData(),
              variables: context.getAllVariables(),
              getData: (key: string) => context.getData(key),
              getVariable: (key: string) => context.getVariable(key),
            },
          };

          // Execute user code - wrap in async function to support await
          // The user code should be an expression that evaluates to a boolean
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          const fn = new Function('ctx', `
            const response = ctx.response;
            const context = ctx.context;
            return (${condition.value});
          `);
          const result = fn(contextData);
          const boolResult = !!result;
          const details = `${condition.type} | expression: ${this.truncateString(condition.value, 100)} | result: ${boolResult}`;
          return { met: boolResult, details };
        } catch (error: any) {
          console.warn(`[RetryHelper] API JavaScript condition error: ${error.message}`);
          return { met: false, details: `JavaScript error: ${error.message}` };
        }
      }

      return { met: false, details: 'Unknown condition type' };
    } catch (error: any) {
      console.warn(`[RetryHelper] API condition check error: ${error.message}`);
      return { met: false, details: `Error: ${error.message}` };
    }
  }


  /**
   * Get nested value from object using dot notation path
   */
  private static getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Match a value against an expected value using match type
   */
  private static matchValue(actual: any, expected: any, matchType: MatchType): boolean {
    const actualStr = String(actual);
    const expectedStr = String(expected);

    switch (matchType) {
      case 'equals':
        return actualStr === expectedStr;
      case 'contains':
        return actualStr.includes(expectedStr);
      case 'startsWith':
        return actualStr.startsWith(expectedStr);
      case 'endsWith':
        return actualStr.endsWith(expectedStr);
      case 'regex':
        try {
          const regex = new RegExp(expectedStr);
          return regex.test(actualStr);
        } catch {
          return false;
        }
      default:
        return actualStr === expectedStr;
    }
  }

  /**
   * Calculate delay for retry
   */
  private static calculateDelay(
    attemptNumber: number,
    baseDelay: number,
    strategy: 'fixed' | 'exponential',
    maxDelay?: number
  ): number {
    if (strategy === 'fixed') {
      return baseDelay;
    } else {
      // Exponential backoff: baseDelay * (2 ^ attemptNumber)
      const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
      if (maxDelay !== undefined) {
        return Math.min(exponentialDelay, maxDelay);
      }
      return exponentialDelay;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format value for logging (handles strings, numbers, objects, etc.)
   */
  private static formatValue(value: any): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') {
      // Remove quotes for simple strings in logs for readability
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Truncate string if too long
   */
  private static truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}

