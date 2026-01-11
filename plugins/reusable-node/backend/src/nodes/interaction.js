"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeHandler = exports.ClickHandler = void 0;
const waitHelper_1 = require("../utils/waitHelper");
const retryHelper_1 = require("../utils/retryHelper");
class ClickHandler {
    async execute(node, context) {
        const data = node.data;
        const page = context.getPage();
        if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
        }
        if (!data.selector) {
            throw new Error('Selector is required for Click node');
        }
        const timeout = data.timeout || 30000;
        const selector = data.selector;
        // Execute click operation with retry logic (includes wait conditions)
        const result = await retryHelper_1.RetryHelper.executeWithRetry(async () => {
            const waitAfterOperation = data.waitAfterOperation || false;
            // Execute waits before operation if waitAfterOperation is false
            if (!waitAfterOperation) {
                await waitHelper_1.WaitHelper.executeWaits(page, {
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
            // Execute click operation
            if (data.selectorType === 'xpath') {
                await page.locator(`xpath=${selector}`).click({ timeout });
            }
            else {
                await page.click(selector, { timeout });
            }
            // Execute waits after operation if waitAfterOperation is true
            if (waitAfterOperation) {
                await waitHelper_1.WaitHelper.executeWaits(page, {
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
        }, {
            enabled: data.retryEnabled || false,
            strategy: data.retryStrategy || 'count',
            count: data.retryCount,
            untilCondition: data.retryUntilCondition,
            delay: data.retryDelay || 1000,
            delayStrategy: data.retryDelayStrategy || 'fixed',
            maxDelay: data.retryMaxDelay,
            failSilently: data.failSilently || false,
        }, page);
        // If RetryHelper returned undefined (failSilently), throw error so executor can track it
        if (result === undefined && data.failSilently) {
            throw new Error(`Click operation failed silently on selector: ${selector}`);
        }
    }
}
exports.ClickHandler = ClickHandler;
class TypeHandler {
    async execute(node, context) {
        const data = node.data;
        const page = context.getPage();
        if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
        }
        if (!data.selector) {
            throw new Error('Selector is required for Type node');
        }
        if (data.text === undefined) {
            throw new Error('Text is required for Type node');
        }
        const timeout = data.timeout || 30000;
        const selector = data.selector;
        const text = data.text;
        // Execute type operation with retry logic (includes wait conditions)
        const result = await retryHelper_1.RetryHelper.executeWithRetry(async () => {
            const waitAfterOperation = data.waitAfterOperation || false;
            // Execute waits before operation if waitAfterOperation is false
            if (!waitAfterOperation) {
                await waitHelper_1.WaitHelper.executeWaits(page, {
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
            // Execute type operation
            if (data.selectorType === 'xpath') {
                await page.locator(`xpath=${selector}`).fill(text, { timeout });
            }
            else {
                await page.fill(selector, text, { timeout });
            }
            // Execute waits after operation if waitAfterOperation is true
            if (waitAfterOperation) {
                await waitHelper_1.WaitHelper.executeWaits(page, {
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
        }, {
            enabled: data.retryEnabled || false,
            strategy: data.retryStrategy || 'count',
            count: data.retryCount,
            untilCondition: data.retryUntilCondition,
            delay: data.retryDelay || 1000,
            delayStrategy: data.retryDelayStrategy || 'fixed',
            maxDelay: data.retryMaxDelay,
            failSilently: data.failSilently || false,
        }, page);
        // If RetryHelper returned undefined (failSilently), throw error so executor can track it
        if (result === undefined && data.failSilently) {
            throw new Error(`Type operation failed silently on selector: ${selector}`);
        }
    }
}
exports.TypeHandler = TypeHandler;
