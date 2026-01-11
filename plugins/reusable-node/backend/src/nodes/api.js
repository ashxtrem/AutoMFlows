"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiCurlHandler = exports.ApiRequestHandler = void 0;
const variableInterpolator_1 = require("../utils/variableInterpolator");
const httpClient_1 = require("../utils/httpClient");
const curlParser_1 = require("../utils/curlParser");
const retryHelper_1 = require("../utils/retryHelper");
class ApiRequestHandler {
    async execute(node, context) {
        const data = node.data;
        if (!data.url) {
            throw new Error('URL is required for API Request node');
        }
        const contextKey = data.contextKey || 'apiResponse';
        const timeout = data.timeout || 30000;
        // Interpolate variables in URL, headers, and body
        const interpolatedUrl = variableInterpolator_1.VariableInterpolator.interpolateString(data.url, context);
        const interpolatedHeaders = data.headers
            ? variableInterpolator_1.VariableInterpolator.interpolateObject(data.headers, context)
            : undefined;
        const interpolatedBody = data.body
            ? variableInterpolator_1.VariableInterpolator.interpolateString(data.body, context)
            : undefined;
        // Build request config
        const requestConfig = {
            method: data.method || 'GET',
            url: interpolatedUrl,
            headers: interpolatedHeaders,
            body: interpolatedBody,
            bodyType: data.bodyType || 'json',
            timeout,
        };
        // Execute request with retry logic
        const result = await retryHelper_1.RetryHelper.executeWithRetry(async () => {
            const response = await httpClient_1.HttpClient.executeRequest(requestConfig);
            // Store response in context
            const responseData = {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: response.body,
                duration: response.duration,
                timestamp: response.timestamp,
            };
            context.setData(contextKey, responseData);
            return responseData;
        }, {
            enabled: data.retryEnabled || false,
            strategy: data.retryStrategy || 'count',
            count: data.retryCount,
            untilCondition: data.retryUntilCondition,
            delay: data.retryDelay || 1000,
            delayStrategy: data.retryDelayStrategy || 'fixed',
            maxDelay: data.retryMaxDelay,
            failSilently: data.failSilently || false,
            context: context, // Pass context for API condition checking
        }, null // No page object needed for API requests
        );
        // If RetryHelper returned undefined (failSilently), throw error so executor can track it
        if (result === undefined && data.failSilently) {
            throw new Error(`API Request operation failed silently for URL: ${interpolatedUrl}`);
        }
    }
}
exports.ApiRequestHandler = ApiRequestHandler;
class ApiCurlHandler {
    async execute(node, context) {
        const data = node.data;
        if (!data.curlCommand) {
            throw new Error('cURL command is required for API cURL node');
        }
        const contextKey = data.contextKey || 'apiResponse';
        const timeout = data.timeout || 30000;
        // Interpolate variables in cURL command
        const interpolatedCommand = variableInterpolator_1.VariableInterpolator.interpolateString(data.curlCommand, context);
        // Parse cURL command
        let requestConfig;
        try {
            requestConfig = curlParser_1.CurlParser.parse(interpolatedCommand);
        }
        catch (error) {
            throw new Error(`Failed to parse cURL command: ${error.message}`);
        }
        // Override timeout if specified in node data
        if (timeout) {
            requestConfig.timeout = timeout;
        }
        // Execute request with retry logic
        const result = await retryHelper_1.RetryHelper.executeWithRetry(async () => {
            const response = await httpClient_1.HttpClient.executeRequest(requestConfig);
            // Store response in context
            const responseData = {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: response.body,
                duration: response.duration,
                timestamp: response.timestamp,
            };
            context.setData(contextKey, responseData);
            return responseData;
        }, {
            enabled: data.retryEnabled || false,
            strategy: data.retryStrategy || 'count',
            count: data.retryCount,
            untilCondition: data.retryUntilCondition,
            delay: data.retryDelay || 1000,
            delayStrategy: data.retryDelayStrategy || 'fixed',
            maxDelay: data.retryMaxDelay,
            failSilently: data.failSilently || false,
            context: context, // Pass context for API condition checking
        }, null // No page object needed for API requests
        );
        // If RetryHelper returned undefined (failSilently), throw error so executor can track it
        if (result === undefined && data.failSilently) {
            throw new Error(`API cURL operation failed silently for command: ${interpolatedCommand.substring(0, 100)}...`);
        }
    }
}
exports.ApiCurlHandler = ApiCurlHandler;
