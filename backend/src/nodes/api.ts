import { BaseNode, ApiRequestNodeData, ApiCurlNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { VariableInterpolator } from '../utils/variableInterpolator';
import { HttpClient, ApiRequestConfig } from '../utils/httpClient';
import { CurlParser } from '../utils/curlParser';
import { RetryHelper } from '../utils/retryHelper';

/**
 * Helper function to format body for logging
 * If body is a JSON string, parse and re-stringify it nicely
 */
function formatBodyForLogging(body: string | undefined, bodyType?: string): string | undefined {
  if (!body) return body;
  
  // If it's JSON type or looks like JSON, try to format it nicely
  if (bodyType === 'json' || (typeof body === 'string' && body.trim().startsWith('{'))) {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If parsing fails, return as-is
      return body;
    }
  }
  
  return body;
}

export class ApiRequestHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ApiRequestNodeData;

    if (!data.url) {
      throw new Error('URL is required for API Request node');
    }

    const contextKey = data.contextKey || 'apiResponse';
    const timeout = data.timeout || 30000;

    // Get trace logging function from context
    const traceLog = context.getData('traceLog') as ((message: string) => void) | undefined;
    const traceLogsEnabled = context.getData('traceLogs') as boolean | undefined;

    // Interpolate variables in URL, headers, and body
    const interpolatedUrl = VariableInterpolator.interpolateString(data.url, context);
    const interpolatedHeaders = data.headers 
      ? VariableInterpolator.interpolateObject(data.headers, context) as Record<string, string>
      : undefined;
    const interpolatedBody = data.body 
      ? VariableInterpolator.interpolateString(data.body, context)
      : undefined;

    // Interpolate form fields and files
    const interpolatedFormFields = data.formFields
      ? data.formFields.map(field => ({
          ...field,
          value: VariableInterpolator.interpolateString(field.value, context),
        }))
      : undefined;
    
    const interpolatedFormFiles = data.formFiles
      ? data.formFiles.map(fileField => ({
          ...fileField,
          filePath: VariableInterpolator.interpolateString(fileField.filePath, context),
        }))
      : undefined;

    // Build request config
    const requestConfig: ApiRequestConfig = {
      method: data.method || 'GET',
      url: interpolatedUrl,
      headers: interpolatedHeaders,
      body: interpolatedBody,
      bodyType: data.bodyType || 'json',
      formFields: interpolatedFormFields,
      formFiles: interpolatedFormFiles,
      timeout,
    };

    // Log API request if trace logs are enabled
    if (traceLogsEnabled && traceLog) {
      const requestLog = {
        method: requestConfig.method,
        url: requestConfig.url,
        headers: requestConfig.headers,
        body: formatBodyForLogging(requestConfig.body, requestConfig.bodyType),
        bodyType: requestConfig.bodyType,
        formFields: requestConfig.formFields,
        formFiles: requestConfig.formFiles,
        timeout: requestConfig.timeout,
      };
      traceLog(`[TRACE] API Request: ${JSON.stringify(requestLog, null, 2)}`);
    }

    // Execute request with retry logic
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const response = await HttpClient.executeRequest(requestConfig);
        
        // Log API response if trace logs are enabled
        if (traceLogsEnabled && traceLog) {
          const responseLog = {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: response.body,
            duration: response.duration,
            timestamp: response.timestamp,
          };
          traceLog(`[TRACE] API Response: ${JSON.stringify(responseLog, null, 2)}`);
        }
        
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

    // Get trace logging function from context
    const traceLog = context.getData('traceLog') as ((message: string) => void) | undefined;
    const traceLogsEnabled = context.getData('traceLogs') as boolean | undefined;

    // Interpolate variables in cURL command
    const interpolatedCommand = VariableInterpolator.interpolateString(data.curlCommand, context);

    // Log resolved cURL command if trace logs are enabled
    if (traceLogsEnabled && traceLog) {
      traceLog(`[TRACE] Resolved cURL command: ${interpolatedCommand}`);
    }

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

    // Interpolate file paths in formFiles (in case they contain variables)
    if (requestConfig.formFiles) {
      requestConfig.formFiles = requestConfig.formFiles.map(fileField => ({
        ...fileField,
        filePath: VariableInterpolator.interpolateString(fileField.filePath, context),
      }));
    }
    
    // Interpolate values in formFields (in case they contain variables)
    if (requestConfig.formFields) {
      requestConfig.formFields = requestConfig.formFields.map(field => ({
        ...field,
        value: VariableInterpolator.interpolateString(field.value, context),
      }));
    }

    // Log API request if trace logs are enabled
    if (traceLogsEnabled && traceLog) {
      const requestLog = {
        method: requestConfig.method,
        url: requestConfig.url,
        headers: requestConfig.headers,
        body: formatBodyForLogging(requestConfig.body, requestConfig.bodyType),
        bodyType: requestConfig.bodyType,
        formFields: requestConfig.formFields,
        formFiles: requestConfig.formFiles,
        timeout: requestConfig.timeout,
      };
      traceLog(`[TRACE] API Request (cURL): ${JSON.stringify(requestLog, null, 2)}`);
    }

    // Execute request with retry logic
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const response = await HttpClient.executeRequest(requestConfig);
        
        // Log API response if trace logs are enabled
        if (traceLogsEnabled && traceLog) {
          const responseLog = {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: response.body,
            duration: response.duration,
            timestamp: response.timestamp,
          };
          traceLog(`[TRACE] API Response (cURL): ${JSON.stringify(responseLog, null, 2)}`);
        }
        
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
