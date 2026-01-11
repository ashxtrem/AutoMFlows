"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigateHandler = exports.OpenBrowserHandler = void 0;
const waitHelper_1 = require("../utils/waitHelper");
const retryHelper_1 = require("../utils/retryHelper");
const variableInterpolator_1 = require("../utils/variableInterpolator");
class OpenBrowserHandler {
    async execute(node, context) {
        const data = node.data;
        const playwright = context.playwright;
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
            const page = await playwright.launch(headless, viewport, browserType, maxWindow, capabilities, stealthMode, launchOptions, jsScript);
            context.setPage(page);
        }
        catch (error) {
            // Re-throw with browser installation info if it's a browser installation error
            if (error.message.includes('is not installed')) {
                throw error;
            }
            throw error;
        }
    }
}
exports.OpenBrowserHandler = OpenBrowserHandler;
class NavigateHandler {
    async execute(node, context) {
        const data = node.data;
        const page = context.getPage();
        if (!page) {
            throw new Error('No page available. Ensure Open Browser node is executed first.');
        }
        if (!data.url) {
            throw new Error('URL is required for Navigate node');
        }
        // Interpolate variables in URL
        let url = variableInterpolator_1.VariableInterpolator.interpolateString(data.url, context);
        // Normalize URL - add https:// if no protocol is specified
        url = url.trim();
        if (!url.match(/^https?:\/\//i)) {
            url = `https://${url}`;
        }
        // Prepare navigation options
        const timeout = data.timeout || 30000;
        const waitUntil = data.waitUntil || 'networkidle';
        const gotoOptions = {
            waitUntil,
            timeout,
        };
        if (data.referer) {
            gotoOptions.referer = data.referer;
        }
        // Execute navigation with retry logic (includes wait conditions)
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
            // Execute navigation
            await page.goto(url, gotoOptions);
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
            throw new Error(`Navigation operation failed silently to URL: ${url}`);
        }
    }
}
exports.NavigateHandler = NavigateHandler;
