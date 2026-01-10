import { BaseNode, GetTextNodeData, ScreenshotNodeData, WaitNodeData, IntValueNodeData, StringValueNodeData, BooleanValueNodeData, InputValueNodeData, VerifyNodeData, NodeType } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { WaitHelper } from '../utils/waitHelper';
import { RetryHelper } from '../utils/retryHelper';
import { verificationStrategyRegistry } from './verification/strategies';

export class GetTextHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as GetTextNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Get Text node');
    }

    const timeout = data.timeout || 30000;
    const selector = data.selector;
    const outputVariable = data.outputVariable || 'text';

    // Execute getText operation with retry logic (includes wait conditions)
    const text = await RetryHelper.executeWithRetry(
      async () => {
        const waitAfterOperation = data.waitAfterOperation || false;
        
        // Execute waits before operation if waitAfterOperation is false
        if (!waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
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

        // Execute getText operation
        let result: string | null;
        if (data.selectorType === 'xpath') {
          result = await page.locator(`xpath=${selector}`).textContent({ timeout });
        } else {
          result = await page.textContent(selector, { timeout });
        }

        // Execute waits after operation if waitAfterOperation is true
        if (waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
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

        return result || '';
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
      },
      page
    );

    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (text === undefined && data.failSilently) {
      throw new Error(`Get Text operation failed silently on selector: ${selector}`);
    }
    
    context.setData(outputVariable, text || '');
  }
}

export class ScreenshotHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ScreenshotNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    const playwright = (context as any).playwright as any;
    if (!playwright) {
      throw new Error('Playwright manager not found in context');
    }

    // Execute screenshot operation with retry logic (includes wait conditions)
    const result = await RetryHelper.executeWithRetry(
      async () => {
        const waitAfterOperation = data.waitAfterOperation || false;
        
        // Execute waits before operation if waitAfterOperation is false
        if (!waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: 30000,
            waitTiming: 'before',
          });
        }

        // Execute screenshot operation
        const fullPage = data.fullPage || false;
        const screenshotPath = await playwright.takeScreenshot(data.path, fullPage);
        context.setData('screenshotPath', screenshotPath);

        // Execute waits after operation if waitAfterOperation is true
        if (waitAfterOperation) {
          await WaitHelper.executeWaits(page, {
            waitForSelector: data.waitForSelector,
            waitForSelectorType: data.waitForSelectorType,
            waitForSelectorTimeout: data.waitForSelectorTimeout,
            waitForUrl: data.waitForUrl,
            waitForUrlTimeout: data.waitForUrlTimeout,
            waitForCondition: data.waitForCondition,
            waitForConditionTimeout: data.waitForConditionTimeout,
            waitStrategy: data.waitStrategy,
            failSilently: data.failSilently || false,
            defaultTimeout: 30000,
            waitTiming: 'after',
          });
        }
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
      },
      page
    );
    
    // If RetryHelper returned undefined (failSilently), throw error so executor can track it
    if (result === undefined && data.failSilently) {
      throw new Error(`Screenshot operation failed silently`);
    }
  }
}

export class WaitHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as WaitNodeData;
    const page = context.getPage();

    // API response wait doesn't require a page
    if (data.waitType !== 'api-response' && !page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    // Execute wait operation with retry logic
    const result = await RetryHelper.executeWithRetry(
      async () => {
        if (data.waitType === 'timeout') {
          if (!page) {
            throw new Error('Page is required for timeout wait');
          }
          const timeout = typeof data.value === 'number' ? data.value : parseInt(String(data.value), 10);
          if (isNaN(timeout)) {
            throw new Error('Invalid timeout value for Wait node');
          }
          await page.waitForTimeout(timeout);
        } else if (data.waitType === 'selector') {
          if (!page) {
            throw new Error('Page is required for selector wait');
          }
          const selector = String(data.value);
          const timeout = data.timeout || 30000;

          if (data.selectorType === 'xpath') {
            await page.locator(`xpath=${selector}`).waitFor({ timeout });
          } else {
            await page.waitForSelector(selector, { timeout });
          }
        } else if (data.waitType === 'url') {
          if (!page) {
            throw new Error('Page is required for URL wait');
          }
          const urlPattern = String(data.value);
          const timeout = data.timeout || 30000;
          await WaitHelper.waitForUrl(page, urlPattern, timeout, data.failSilently || false, 'before');
        } else if (data.waitType === 'condition') {
          if (!page) {
            throw new Error('Page is required for condition wait');
          }
          const condition = String(data.value);
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
      {
        enabled: data.retryEnabled || false,
        strategy: data.retryStrategy || 'count',
        count: data.retryCount,
        untilCondition: data.retryUntilCondition,
        delay: data.retryDelay || 1000,
        delayStrategy: data.retryDelayStrategy || 'fixed',
        maxDelay: data.retryMaxDelay,
        failSilently: data.failSilently || false,
      },
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

export class IntValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as IntValueNodeData;
    
    // Store the value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, data.value);
    
    // Also store in data for compatibility
    context.setData('value', data.value);
  }
}

export class StringValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as StringValueNodeData;
    
    // Store the value in context with the node ID as key
    context.setVariable(node.id, data.value);
    
    // Also store in data for compatibility
    context.setData('value', data.value);
  }
}

export class BooleanValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as BooleanValueNodeData;
    
    // Store the value in context with the node ID as key
    context.setVariable(node.id, data.value);
    
    // Also store in data for compatibility
    context.setData('value', data.value);
  }
}

export class InputValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as InputValueNodeData;
    
    // Convert value based on dataType
    let convertedValue: string | number | boolean = data.value;
    
    if (data.dataType === 'int') {
      convertedValue = typeof data.value === 'number' ? Math.floor(data.value) : parseInt(String(data.value), 10);
      if (isNaN(convertedValue as number)) {
        convertedValue = 0;
      }
    } else if (data.dataType === 'float' || data.dataType === 'double') {
      convertedValue = typeof data.value === 'number' ? data.value : parseFloat(String(data.value));
      if (isNaN(convertedValue as number)) {
        convertedValue = 0;
      }
    } else if (data.dataType === 'boolean') {
      if (typeof data.value === 'boolean') {
        convertedValue = data.value;
      } else {
        convertedValue = data.value === 'true' || data.value === 1 || data.value === '1';
      }
    } else {
      // String
      convertedValue = String(data.value || '');
    }
    
    // Store the converted value in context with the node ID as key
    context.setVariable(node.id, convertedValue);
    
    // Also store in data for compatibility
    context.setData('value', convertedValue);
  }
}

export class VerifyHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as VerifyNodeData;

    if (!data.domain) {
      throw new Error('Domain is required for Verify node');
    }

    if (!data.verificationType) {
      throw new Error('Verification type is required for Verify node');
    }

    // Get the appropriate verification strategy
    const strategy = verificationStrategyRegistry.get(data.domain, data.verificationType);
    if (!strategy) {
      throw new Error(`No verification strategy found for domain "${data.domain}" and type "${data.verificationType}"`);
    }

    // Validate configuration
    const validation = strategy.validateConfig(data);
    if (!validation.valid) {
      throw new Error(`Verification configuration invalid: ${validation.error}`);
    }

    const timeout = data.timeout || 30000;
    const failSilently = data.failSilently || false;

    let result: any;
    
    // For API domain, retry is not needed as API execution nodes already handle retries
    // If verification fails, the API needs to be triggered again, which is handled by API execution nodes
    const isApiDomain = data.domain === 'api';
    
    try {
      if (isApiDomain) {
        // Execute verification directly without retry logic for API domain
        let verificationResult: any;
        try {
          verificationResult = await strategy.execute(context, data);
        } catch (strategyError: any) {
          // If strategy.execute() itself throws an error and failSilently is true, create a failed result instead of throwing
          if (failSilently) {
            result = {
              passed: false,
              message: `Verification execution error: ${strategyError.message}`,
              actualValue: undefined,
              expectedValue: undefined,
            };
          } else {
            // Re-throw if failSilently is false
            throw strategyError;
          }
        }
        
        if (!result) {
          // If verification failed and failSilently is false, throw error
          // If failSilently is true, return the failed result and continue
          if (!verificationResult.passed && !failSilently) {
            throw new Error(verificationResult.message);
          }
          result = verificationResult;
        }
      } else {
        // Execute verification with retry logic for browser and other domains
        // Note: We wrap the verification execution to handle failSilently properly
        result = await RetryHelper.executeWithRetry(
          async () => {
            let verificationResult: any;
            try {
              verificationResult = await strategy.execute(context, data);
            } catch (strategyError: any) {
              // If strategy.execute() itself throws an error (e.g., timeout, page not available)
              // and failSilently is true, create a failed result instead of throwing
              if (failSilently) {
                return {
                  passed: false,
                  message: `Verification execution error: ${strategyError.message}`,
                  actualValue: undefined,
                  expectedValue: undefined,
                };
              }
              // Re-throw if failSilently is false
              throw strategyError;
            }
            
            // If verification failed and failSilently is false, throw error
            // If failSilently is true, return the failed result and continue
            if (!verificationResult.passed && !failSilently) {
              throw new Error(verificationResult.message);
            }

            return verificationResult;
          },
          {
            enabled: data.retryEnabled || false,
            strategy: data.retryStrategy || 'count',
            count: data.retryCount,
            untilCondition: data.retryUntilCondition,
            delay: data.retryDelay || 1000,
            delayStrategy: data.retryDelayStrategy || 'fixed',
            maxDelay: data.retryMaxDelay,
            failSilently: false, // Don't let RetryHelper handle failSilently, we handle it here
          },
          context.getPage()
        );
      }
    } catch (error: any) {
      // This catch block handles errors from RetryHelper (e.g., when retries are exhausted)
      // If failSilently is enabled, catch the error and try to get the verification result
      if (failSilently) {
        try {
          // Try to execute verification one more time to get the actual result
          result = await strategy.execute(context, data);
          console.warn(`[VERIFY] Verification failed but continuing (failSilently=true): ${result.message}`);
        } catch (innerError: any) {
          // If we can't get the result (e.g., page error, timeout), create a generic failed result
          result = {
            passed: false,
            message: error.message || 'Verification failed',
            actualValue: undefined,
            expectedValue: undefined,
          };
          console.warn(`[VERIFY] Verification failed but continuing (failSilently=true): ${error.message}`);
        }
      } else {
        // Re-throw if failSilently is false
        throw error;
      }
    }

    // Store verification result in context
    const verificationResult = {
      passed: result.passed,
      message: result.message,
      domain: data.domain,
      type: data.verificationType,
      actualValue: result.actualValue,
      expectedValue: result.expectedValue,
      details: result.details,
    };
    
    context.setData('verificationResult', verificationResult);
    
    // If verification failed and failSilently is enabled, throw error so executor can track it
    if (!result.passed && failSilently) {
      throw new Error(result.message || 'Verification failed silently');
    }
    
    // Log verification result for visibility
    if (result.passed) {
      console.log(`[VERIFY] ✓ Verification PASSED: ${result.message}`);
      if (result.actualValue !== undefined && result.expectedValue !== undefined) {
        console.log(`[VERIFY] Expected: ${JSON.stringify(result.expectedValue)}, Actual: ${JSON.stringify(result.actualValue)}`);
      }
    } else {
      console.log(`[VERIFY] ✗ Verification FAILED: ${result.message}`);
      if (result.actualValue !== undefined && result.expectedValue !== undefined) {
        console.log(`[VERIFY] Expected: ${JSON.stringify(result.expectedValue)}, Actual: ${JSON.stringify(result.actualValue)}`);
      }
    }
  }
}
