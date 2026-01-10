import { VerifyNodeData, MatchType } from '@automflows/shared';
import { ContextManager } from '../../../engine/context';
import { BaseVerificationStrategy, VerificationResult } from './base';

/**
 * API Status Code Verification Strategy
 */
export class ApiStatusStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const apiContextKey = config.apiContextKey || 'apiResponse';
    const apiResponse = context.getData(apiContextKey);

    if (!apiResponse) {
      throw new Error(`API response not found in context with key: ${apiContextKey}. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
    }

    const expectedStatus = this.resolveValue(config.statusCode, context, config, 'statusCode');
    if (expectedStatus === undefined || expectedStatus === null) {
      throw new Error('Status code is required for API status verification');
    }

    const actualStatus = apiResponse.status;
    const passed = actualStatus === expectedStatus;

    return {
      passed,
      message: passed
        ? `API status verification passed: Status code ${actualStatus} matches expected ${expectedStatus}`
        : `API status verification failed: Expected status code ${expectedStatus}, but got ${actualStatus}`,
      actualValue: actualStatus,
      expectedValue: expectedStatus,
      details: {
        apiContextKey,
        statusText: apiResponse.statusText,
      },
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (config.statusCode === undefined || config.statusCode === null) {
      return { valid: false, error: 'Status code is required' };
    }
    if (config.apiContextKey && typeof config.apiContextKey !== 'string') {
      return { valid: false, error: 'API context key must be a string' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['statusCode'];
  }
}

/**
 * API Header Verification Strategy
 */
export class ApiHeaderStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const apiContextKey = config.apiContextKey || 'apiResponse';
    const apiResponse = context.getData(apiContextKey);

    if (!apiResponse) {
      throw new Error(`API response not found in context with key: ${apiContextKey}. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
    }

    const headerName = config.headerName;
    if (!headerName) {
      throw new Error('Header name is required for API header verification');
    }

    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    if (expectedValue === undefined || expectedValue === null) {
      throw new Error('Expected header value is required');
    }

    const matchType = config.matchType || 'equals';
    const caseSensitive = config.caseSensitive || false;

    // Headers are case-insensitive, so check both cases
    const headers = apiResponse.headers || {};
    const headerValue = headers[headerName.toLowerCase()] || headers[headerName] || headers[Object.keys(headers).find(k => k.toLowerCase() === headerName.toLowerCase()) || ''];

    if (headerValue === undefined) {
      return {
        passed: false,
        message: `API header verification failed: Header "${headerName}" not found in response`,
        actualValue: undefined,
        expectedValue,
        details: {
          apiContextKey,
          availableHeaders: Object.keys(headers),
        },
      };
    }

    const passed = this.matchValue(String(headerValue), String(expectedValue), matchType, caseSensitive);

    return {
      passed,
      message: passed
        ? `API header verification passed: Header "${headerName}" has value "${headerValue}" matching expected "${expectedValue}"`
        : `API header verification failed: Header "${headerName}" has value "${headerValue}" but expected "${expectedValue}" (match type: ${matchType})`,
      actualValue: headerValue,
      expectedValue,
      details: {
        apiContextKey,
        headerName,
      },
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.headerName) {
      return { valid: false, error: 'Header name is required' };
    }
    if (config.expectedValue === undefined || config.expectedValue === null) {
      return { valid: false, error: 'Expected header value is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['headerName', 'expectedValue'];
  }
}

/**
 * API Body Path Verification Strategy
 * Verifies a specific JSON path in the response body
 */
export class ApiBodyPathStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const apiContextKey = config.apiContextKey || 'apiResponse';
    const apiResponse = context.getData(apiContextKey);

    if (!apiResponse) {
      throw new Error(`API response not found in context with key: ${apiContextKey}. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
    }

    const jsonPath = config.jsonPath;
    if (!jsonPath) {
      throw new Error('JSON path is required for API body path verification');
    }

    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    if (expectedValue === undefined || expectedValue === null) {
      throw new Error('Expected value is required');
    }

    const matchType = config.matchType || 'equals';
    const caseSensitive = config.caseSensitive || false;

    // Get value from nested path
    const actualValue = this.getNestedValue(apiResponse.body, jsonPath);

    if (actualValue === undefined) {
      return {
        passed: false,
        message: `API body path verification failed: Path "${jsonPath}" not found in response body`,
        actualValue: undefined,
        expectedValue,
        details: {
          apiContextKey,
          jsonPath,
        },
      };
    }

    const passed = this.matchValue(actualValue, expectedValue, matchType, caseSensitive);

    return {
      passed,
      message: passed
        ? `API body path verification passed: Path "${jsonPath}" has value "${JSON.stringify(actualValue)}" matching expected "${JSON.stringify(expectedValue)}"`
        : `API body path verification failed: Path "${jsonPath}" has value "${JSON.stringify(actualValue)}" but expected "${JSON.stringify(expectedValue)}" (match type: ${matchType})`,
      actualValue,
      expectedValue,
      details: {
        apiContextKey,
        jsonPath,
      },
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.jsonPath) {
      return { valid: false, error: 'JSON path is required' };
    }
    if (config.expectedValue === undefined || config.expectedValue === null) {
      return { valid: false, error: 'Expected value is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['jsonPath', 'expectedValue'];
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
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
}

/**
 * API Body Value Verification Strategy
 * Verifies the entire response body
 */
export class ApiBodyValueStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const apiContextKey = config.apiContextKey || 'apiResponse';
    const apiResponse = context.getData(apiContextKey);

    if (!apiResponse) {
      throw new Error(`API response not found in context with key: ${apiContextKey}. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
    }

    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    if (expectedValue === undefined || expectedValue === null) {
      throw new Error('Expected value is required');
    }

    const matchType = config.matchType || 'equals';
    const caseSensitive = config.caseSensitive || false;

    const actualValue = apiResponse.body;

    // For body value comparison, we compare the entire body
    // Convert both to strings for comparison
    const actualStr = typeof actualValue === 'object' ? JSON.stringify(actualValue) : String(actualValue);
    const expectedStr = typeof expectedValue === 'object' ? JSON.stringify(expectedValue) : String(expectedValue);

    const passed = this.matchValue(actualStr, expectedStr, matchType, caseSensitive);

    return {
      passed,
      message: passed
        ? `API body value verification passed: Response body matches expected value`
        : `API body value verification failed: Response body does not match expected value (match type: ${matchType})`,
      actualValue,
      expectedValue,
      details: {
        apiContextKey,
      },
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (config.expectedValue === undefined || config.expectedValue === null) {
      return { valid: false, error: 'Expected value is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['expectedValue'];
  }
}
