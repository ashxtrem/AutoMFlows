/**
 * RetryHelper utility for retry operations
 * Provides retry logic with count-based and condition-based strategies
 */

export interface RetryOptions {
  enabled: boolean;
  strategy: 'count' | 'untilCondition';
  count?: number; // For count strategy
  untilCondition?: {
    type: 'selector' | 'url' | 'javascript';
    value: string;
    selectorType?: 'css' | 'xpath';
    timeout?: number; // Max time to retry
  };
  delay?: number; // Base delay in ms
  delayStrategy?: 'fixed' | 'exponential';
  maxDelay?: number; // Max delay for exponential (optional)
  failSilently?: boolean;
}

export class RetryHelper {
  /**
   * Execute an operation with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    page?: any
  ): Promise<T> {
    if (!options.enabled) {
      return operation();
    }

    if (options.strategy === 'count') {
      return this.retryWithCount(operation, options);
    } else if (options.strategy === 'untilCondition') {
      if (!page) {
        throw new Error('Page is required for retry until condition strategy');
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
        const conditionMet = await this.checkCondition(page, condition);
        if (conditionMet) {
          return result;
        }

        // Condition not met, retry
        const retryDelay = this.calculateDelay(attempt, delay, delayStrategy, maxDelay);
        console.log(`Retry attempt ${attempt}: Condition not met. Retrying in ${retryDelay}ms...`);

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
          const conditionMet = await this.checkCondition(page, condition);
          if (conditionMet) {
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
   * Check if condition is met
   */
  private static async checkCondition(
    page: any,
    condition: { type: 'selector' | 'url' | 'javascript'; value: string; selectorType?: 'css' | 'xpath' }
  ): Promise<boolean> {
    try {
      if (condition.type === 'selector') {
        const selectorType = condition.selectorType || 'css';
        if (selectorType === 'xpath') {
          const element = await page.locator(`xpath=${condition.value}`).first();
          return await element.isVisible().catch(() => false);
        } else {
          const element = await page.locator(condition.value).first();
          return await element.isVisible().catch(() => false);
        }
      } else if (condition.type === 'url') {
        const currentUrl = page.url();
        // Try to compile as regex first, fallback to string match
        try {
          let regex: RegExp;
          if (condition.value.startsWith('/') && condition.value.endsWith('/')) {
            const pattern = condition.value.slice(1, -1);
            regex = new RegExp(pattern);
          } else {
            regex = new RegExp(condition.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          }
          return regex.test(currentUrl);
        } catch {
          return currentUrl.includes(condition.value);
        }
      } else if (condition.type === 'javascript') {
        const result = await page.evaluate(condition.value);
        return !!result;
      }
      return false;
    } catch {
      return false;
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
}

