import { BaseNode, WaitNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { LocatorHelper } from '../../utils/locatorHelper';

export class WaitHandler implements NodeHandler {
  private static pauseWarningLogged = new Set<string>(); // Track warnings per execution

  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as WaitNodeData;
    const page = context.getPage();

    // Check if this is parallel execution mode
    const isParallelExecution = context.getData('isParallelExecution') === true;
    const executionId = context.getData('executionId') as string | undefined;

    // If pause is enabled, pause execution indefinitely until user clicks continue or stop
    if (data.pause === true) {
      // In parallel mode, skip pause and log warning (once per execution)
      if (isParallelExecution) {
        if (executionId && !WaitHandler.pauseWarningLogged.has(executionId)) {
          console.warn(`[WARN] Wait node pause is not supported in parallel execution. Execution will proceed normally without pausing. Use single workflow execution (/api/workflows/execute) for wait node pause debugging.`);
          WaitHandler.pauseWarningLogged.add(executionId);
        }
        // Skip pause step, proceed directly to wait operation
      } else {
        // Single mode: normal pause behavior
        // Get pauseExecution function from context
        const pauseExecution = context.getData('pauseExecution') as ((nodeId: string, reason: 'wait-pause' | 'breakpoint') => Promise<void>) | undefined;
        const getCurrentNodeId = context.getData('getCurrentNodeId') as (() => string | null) | undefined;
        
        if (pauseExecution && getCurrentNodeId) {
          const nodeId = getCurrentNodeId();
          if (nodeId) {
            // Pause execution indefinitely - wait for user to click continue or stop
            await pauseExecution(nodeId, 'wait-pause');
            // If we reach here, user clicked continue - proceed with actual wait timeout
          }
        }
      }
    }

    // Execute wait operation with retry logic
    const result = await RetryHelper.executeWithRetry(
      async () => {
        if (data.waitType === 'timeout') {
          // Use the user-specified timeout
          const timeout = typeof data.value === 'number' ? data.value : parseInt(String(data.value), 10);
          if (isNaN(timeout)) {
            throw new Error('Invalid timeout value for Wait node');
          }
          
          if (page) {
            // Browser-level wait (preferred when available)
            await page.waitForTimeout(timeout);
          } else {
            // Thread-level wait (fallback when no browser)
            await new Promise(resolve => setTimeout(resolve, timeout));
          }
        } else if (data.waitType === 'selector') {
          if (!page) {
            throw new Error('Page is required for selector wait');
          }
          // Interpolate template variables in selector (e.g., ${data.productIndex})
          const selector = VariableInterpolator.interpolateString(String(data.value), context);
          // Use the user-specified timeout (pause already handled above)
          const timeout = data.timeout || 30000;

          const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');
          await locator.waitFor({ timeout, state: 'visible' });
        } else if (data.waitType === 'url') {
          if (!page) {
            throw new Error('Page is required for URL wait');
          }
          // Interpolate template variables in URL pattern
          const urlPattern = VariableInterpolator.interpolateString(String(data.value), context);
          // Use the user-specified timeout (pause already handled above)
          const timeout = data.timeout || 30000;
          await WaitHelper.waitForUrl(page, urlPattern, timeout, data.failSilently || false, 'before');
        } else if (data.waitType === 'condition') {
          if (!page) {
            throw new Error('Page is required for condition wait');
          }
          // Interpolate template variables in condition
          const condition = VariableInterpolator.interpolateString(String(data.value), context);
          // Use the user-specified timeout (pause already handled above)
          const timeout = data.timeout || 30000;
          await WaitHelper.waitForCondition(page, condition, timeout, data.failSilently || false, 'before');
        } else if (data.waitType === 'api-response') {
          // API response wait - check if API response exists and matches conditions
          if (!data.apiWaitConfig) {
            throw new Error('apiWaitConfig is required for API response wait');
          }

          const contextKey = data.apiWaitConfig.contextKey || String(data.value);
          const apiResponse = context.getData(contextKey);

          if (!apiResponse) {
            throw new Error(`API response not found in context with key: ${contextKey}`);
          }

          // Check based on checkType
          const checkType = data.apiWaitConfig.checkType;
          const expectedValue = data.apiWaitConfig.expectedValue;
          const matchType = data.apiWaitConfig.matchType || 'equals';
          const path = data.apiWaitConfig.path;

          let actualValue: any;
          let passed = false;

          switch (checkType) {
            case 'status':
              actualValue = apiResponse.status;
              passed = this.matchValue(actualValue, expectedValue, matchType);
              break;

            case 'header':
              if (!path) {
                throw new Error('Header name (path) is required for header check');
              }
              actualValue = apiResponse.headers?.[path.toLowerCase()] || apiResponse.headers?.[path];
              if (actualValue === undefined) {
                throw new Error(`Header "${path}" not found in API response`);
              }
              passed = this.matchValue(String(actualValue), String(expectedValue), matchType);
              break;

            case 'body-path':
              if (!path) {
                throw new Error('JSON path is required for body-path check');
              }
              actualValue = this.getNestedValue(apiResponse.body, path);
              if (actualValue === undefined) {
                throw new Error(`Path "${path}" not found in API response body`);
              }
              passed = this.matchValue(actualValue, expectedValue, matchType);
              break;

            case 'body-value':
              actualValue = apiResponse.body;
              passed = this.matchValue(actualValue, expectedValue, matchType);
              break;

            default:
              throw new Error(`Invalid check type: ${checkType}`);
          }

          if (!passed) {
            throw new Error(`API response check failed: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)} (match type: ${matchType})`);
          }
        } else {
          throw new Error(`Invalid wait type: ${data.waitType}`);
        }
      },
      RetryHelper.interpolateRetryOptions({
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      }, context),
      page
    );
    
    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`Wait operation failed silently for waitType: ${data.waitType}`);
    }
  }

  /**
   * Match a value against an expected value using match type
   */
  private matchValue(actual: any, expected: any, matchType: string): boolean {
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
