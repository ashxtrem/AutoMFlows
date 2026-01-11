"use strict";
/**
 * RetryHelper utility for retry operations
 * Provides retry logic with count-based and condition-based strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryHelper = void 0;
class RetryHelper {
    /**
     * Execute an operation with retry logic
     */
    static async executeWithRetry(operation, options, page) {
        if (!options.enabled) {
            // When retry is disabled, still handle failSilently
            try {
                return await operation();
            }
            catch (error) {
                if (options.failSilently) {
                    console.warn(`Operation failed silently: ${error.message}`);
                    return undefined;
                }
                throw error;
            }
        }
        if (options.strategy === 'count') {
            return this.retryWithCount(operation, options);
        }
        else if (options.strategy === 'untilCondition') {
            // Check if this is an API condition (doesn't need page)
            const isApiCondition = options.untilCondition?.type?.startsWith('api-');
            if (!isApiCondition && !page) {
                throw new Error('Page is required for browser-based retry until condition strategy');
            }
            if (isApiCondition && !options.context) {
                throw new Error('Context is required for API retry until condition strategy');
            }
            return this.retryUntilCondition(operation, options, page);
        }
        else {
            throw new Error(`Invalid retry strategy: ${options.strategy}`);
        }
    }
    /**
     * Retry operation a fixed number of times
     */
    static async retryWithCount(operation, options) {
        const retryCount = options.count || 3;
        const delay = options.delay || 1000;
        const delayStrategy = options.delayStrategy || 'fixed';
        const maxDelay = options.maxDelay;
        let lastError = null;
        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
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
            return undefined;
        }
        throw lastError || new Error('Operation failed after retries');
    }
    /**
     * Retry operation until condition is met
     */
    static async retryUntilCondition(operation, options, page) {
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
        let lastError = null;
        while (true) {
            // Check timeout
            const elapsed = Date.now() - startTime;
            if (elapsed >= timeout) {
                if (options.failSilently) {
                    console.warn(`Retry until condition timed out after ${timeout}ms: ${lastError?.message || 'Condition not met'}`);
                    return undefined;
                }
                throw new Error(`Retry until condition timed out after ${timeout}ms: ${lastError?.message || 'Condition not met'}`);
            }
            try {
                // Execute operation
                const result = await operation();
                attempt++;
                // Check if condition is met
                const isApiCondition = condition.type?.startsWith('api-');
                const conditionMet = isApiCondition
                    ? await this.checkApiCondition(options.context, condition)
                    : await this.checkCondition(page, condition);
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
                        return undefined;
                    }
                    throw new Error(`Retry until condition timed out: Condition not met after ${attempt} attempts`);
                }
                await this.sleep(retryDelay);
            }
            catch (error) {
                lastError = error;
                attempt++;
                // Check if condition is met despite error
                try {
                    const isApiCondition = condition.type?.startsWith('api-');
                    const conditionMet = isApiCondition
                        ? await this.checkApiCondition(options.context, condition)
                        : await this.checkCondition(page, condition);
                    if (conditionMet) {
                        return undefined; // Condition met but operation failed
                    }
                }
                catch (conditionError) {
                    // Condition check failed, continue retrying
                }
                // Calculate delay
                const retryDelay = this.calculateDelay(attempt, delay, delayStrategy, maxDelay);
                const elapsed = Date.now() - startTime;
                // Check timeout
                if (elapsed + retryDelay >= timeout) {
                    if (options.failSilently) {
                        console.warn(`Retry until condition timed out after ${timeout}ms: ${error.message}`);
                        return undefined;
                    }
                    throw error;
                }
                console.log(`Retry attempt ${attempt} failed: ${error.message}. Retrying in ${retryDelay}ms...`);
                await this.sleep(retryDelay);
            }
        }
    }
    /**
     * Check if condition is met (browser-based conditions)
     */
    static async checkCondition(page, condition) {
        try {
            if (condition.type === 'selector') {
                const selectorType = condition.selectorType || 'css';
                if (selectorType === 'xpath') {
                    const element = await page.locator(`xpath=${condition.value}`).first();
                    return await element.isVisible().catch(() => false);
                }
                else {
                    const element = await page.locator(condition.value).first();
                    return await element.isVisible().catch(() => false);
                }
            }
            else if (condition.type === 'url') {
                const currentUrl = page.url();
                // Try to compile as regex first, fallback to string match
                try {
                    let regex;
                    if (condition.value.startsWith('/') && condition.value.endsWith('/')) {
                        const pattern = condition.value.slice(1, -1);
                        regex = new RegExp(pattern);
                    }
                    else {
                        regex = new RegExp(condition.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                    }
                    return regex.test(currentUrl);
                }
                catch {
                    return currentUrl.includes(condition.value);
                }
            }
            else if (condition.type === 'javascript') {
                const result = await page.evaluate(condition.value);
                return !!result;
            }
            return false;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if API condition is met
     */
    static async checkApiCondition(context, condition) {
        try {
            // Get the API response from context
            // For api-javascript, use the specified contextKey, otherwise use default
            const contextKey = condition.contextKey || 'apiResponse';
            const apiResponse = context.getData(contextKey);
            if (!apiResponse) {
                // API response not found, condition not met
                return false;
            }
            if (condition.type === 'api-status') {
                // Check if status code matches expected status
                if (condition.expectedStatus === undefined || condition.expectedStatus === null) {
                    return false;
                }
                return apiResponse.status === condition.expectedStatus;
            }
            else if (condition.type === 'api-json-path') {
                // Check if JSON path matches expected value
                if (!condition.jsonPath || condition.expectedValue === undefined) {
                    return false;
                }
                const actualValue = this.getNestedValue(apiResponse.body, condition.jsonPath);
                if (actualValue === undefined) {
                    return false;
                }
                const matchType = condition.matchType || 'equals';
                return this.matchValue(actualValue, condition.expectedValue, matchType);
            }
            else if (condition.type === 'api-javascript') {
                // Execute JavaScript with API response context
                if (!condition.value) {
                    return false;
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
                            getData: (key) => context.getData(key),
                            getVariable: (key) => context.getVariable(key),
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
                    return !!result;
                }
                catch (error) {
                    console.warn(`[RetryHelper] API JavaScript condition error: ${error.message}`);
                    return false;
                }
            }
            return false;
        }
        catch (error) {
            console.warn(`[RetryHelper] API condition check error: ${error.message}`);
            return false;
        }
    }
    /**
     * Get nested value from object using dot notation path
     */
    static getNestedValue(obj, path) {
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
    static matchValue(actual, expected, matchType) {
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
                }
                catch {
                    return false;
                }
            default:
                return actualStr === expectedStr;
        }
    }
    /**
     * Calculate delay for retry
     */
    static calculateDelay(attemptNumber, baseDelay, strategy, maxDelay) {
        if (strategy === 'fixed') {
            return baseDelay;
        }
        else {
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
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RetryHelper = RetryHelper;
