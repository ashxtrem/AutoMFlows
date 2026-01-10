import { BaseNode, ApiRequestNodeData, ApiCurlNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { VariableInterpolator } from '../utils/variableInterpolator';
import { HttpClient, ApiRequestConfig } from '../utils/httpClient';
import { CurlParser } from '../utils/curlParser';
import { RetryHelper } from '../utils/retryHelper';

export class ApiRequestHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ApiRequestNodeData;

    if (!data.url) {
      throw new Error('URL is required for API Request node');
    }

    const contextKey = data.contextKey || 'apiResponse';
    const timeout = data.timeout || 30000;

    // Interpolate variables in URL, headers, and body
    const interpolatedUrl = VariableInterpolator.interpolateString(data.url, context);
    const interpolatedHeaders = data.headers 
      ? VariableInterpolator.interpolateObject(data.headers, context) as Record<string, string>
      : undefined;
    const interpolatedBody = data.body 
      ? VariableInterpolator.interpolateString(data.body, context)
      : undefined;

    // Build request config
    const requestConfig: ApiRequestConfig = {
      method: data.method || 'GET',
      url: interpolatedUrl,
      headers: interpolatedHeaders,
      body: interpolatedBody,
      bodyType: data.bodyType || 'json',
      timeout,
    };

    // Execute request with retry logic
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const response = await HttpClient.executeRequest(requestConfig);
        
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
        context: context, // Pass context for API condition checking
      },
      null // No page object needed for API requests
    );

    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`API Request operation failed silently for URL: ${interpolatedUrl}`);
    }
  }
}

export class ApiCurlHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ApiCurlNodeData;

    if (!data.curlCommand) {
      throw new Error('cURL command is required for API cURL node');
    }

    const contextKey = data.contextKey || 'apiResponse';
    const timeout = data.timeout || 30000;

    // Interpolate variables in cURL command
    const interpolatedCommand = VariableInterpolator.interpolateString(data.curlCommand, context);

    // Parse cURL command
    let requestConfig: ApiRequestConfig;
    try {
      requestConfig = CurlParser.parse(interpolatedCommand);
    } catch (error: any) {
      throw new Error(`Failed to parse cURL command: ${error.message}`);
    }

    // Override timeout if specified in node data
    if (timeout) {
      requestConfig.timeout = timeout;
    }

    // Execute request with retry logic
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const response = await HttpClient.executeRequest(requestConfig);
        
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
        context: context, // Pass context for API condition checking
      },
      null // No page object needed for API requests
    );

    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`API cURL operation failed silently for command: ${interpolatedCommand.substring(0, 100)}...`);
    }
  }
}
