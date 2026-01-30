import { BaseNode, ElementQueryNodeData, ScreenshotNodeData, WaitNodeData, IntValueNodeData, StringValueNodeData, BooleanValueNodeData, InputValueNodeData, VerifyNodeData, StorageNodeData, DialogNodeData, DownloadNodeData, IframeNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { WaitHelper } from '../utils/waitHelper';
import { RetryHelper } from '../utils/retryHelper';
import { VariableInterpolator } from '../utils/variableInterpolator';
import { LocatorHelper } from '../utils/locatorHelper';
import { verificationStrategyRegistry } from './verification/strategies';

export class ElementQueryHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as ElementQueryNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.selector) {
      throw new Error('Selector is required for Element Query node');
    }

    if (!data.action) {
      throw new Error('Action is required for Element Query node');
    }

    const timeout = data.timeout || 30000;
    // Interpolate template variables in selector (e.g., ${data.productIndex})
    const selector = VariableInterpolator.interpolateString(data.selector, context);
    
    // Determine output variable name based on action
    let outputVariable: string;
    switch (data.action) {
      case 'getText':
        outputVariable = data.outputVariable || 'text';
        break;
      case 'getAttribute':
        outputVariable = data.outputVariable || 'attribute';
        break;
      case 'getCount':
        outputVariable = data.outputVariable || 'count';
        break;
      case 'isVisible':
        outputVariable = data.outputVariable || 'isVisible';
        break;
      case 'isEnabled':
        outputVariable = data.outputVariable || 'isEnabled';
        break;
      case 'isChecked':
        outputVariable = data.outputVariable || 'isChecked';
        break;
      case 'getBoundingBox':
        outputVariable = data.outputVariable || 'boundingBox';
        break;
      case 'getAllText':
        outputVariable = data.outputVariable || 'text';
        break;
      default:
        outputVariable = data.outputVariable || 'result';
    }

    // Execute query operation with retry logic (includes wait conditions)
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
            defaultTimeout: timeout,
            waitTiming: 'before',
          }, context);
        }

        // Execute action based on action type
        let queryResult: any;
        const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');

        switch (data.action) {
          case 'getText':
            queryResult = await locator.textContent({ timeout });
            queryResult = queryResult || '';
            break;

          case 'getAttribute':
            if (!data.attributeName) {
              throw new Error('Attribute name is required for getAttribute action');
            }
            const attributeName = VariableInterpolator.interpolateString(data.attributeName, context);
            queryResult = await locator.getAttribute(attributeName, { timeout });
            queryResult = queryResult || null;
            break;

          case 'getCount':
            const count = await locator.count();
            queryResult = count;
            break;

          case 'isVisible':
            try {
              await locator.waitFor({ state: 'visible', timeout });
              queryResult = true;
            } catch {
              queryResult = false;
            }
            break;

          case 'isEnabled':
            const isEnabled = await locator.isEnabled({ timeout }).catch(() => false);
            queryResult = isEnabled;
            break;

          case 'isChecked':
            const isChecked = await locator.isChecked({ timeout }).catch(() => false);
            queryResult = isChecked;
            break;

          case 'getBoundingBox':
            const box = await locator.boundingBox({ timeout });
            queryResult = box || { x: 0, y: 0, width: 0, height: 0 };
            break;

          case 'getAllText':
            const allElements = await locator.all();
            const allTexts: string[] = [];
            for (const element of allElements) {
              const text = await element.textContent();
              if (text !== null) {
                allTexts.push(text);
              }
            }
            queryResult = allTexts;
            break;

          default:
            throw new Error(`Unknown action type: ${data.action}`);
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
          }, context);
        }

        return queryResult;
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
      throw new Error(`Element Query operation failed silently on selector: ${selector} with action: ${data.action}`);
    }
    
    // Store result in context
    context.setData(outputVariable, result);
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

    // Check if execution-specific screenshots directory is available
    const screenshotsDirectory = context.getData('screenshotsDirectory');
    if (screenshotsDirectory && playwright.setScreenshotsDirectory) {
      playwright.setScreenshotsDirectory(screenshotsDirectory);
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
          }, context);
        }

        // Execute screenshot operation based on action
        const action = data.action || (data.fullPage ? 'fullPage' : 'viewport'); // Support legacy fullPage property
        let screenshotPath: string;
        
        switch (action) {
          case 'fullPage':
            screenshotPath = await playwright.takeScreenshot(data.path, true);
            break;
            
          case 'viewport':
            screenshotPath = await playwright.takeScreenshot(data.path, false);
            break;
            
          case 'element':
            if (!data.selector) {
              throw new Error('Selector is required for element screenshot action');
            }
            const selector = VariableInterpolator.interpolateString(data.selector, context);
            const locator = LocatorHelper.createLocator(page, selector, data.selectorType || 'css');
            
            // Handle masking if specified
            // Note: mask selectors use the same selectorType as the main selector
            const maskLocators = data.mask?.map(m => {
              const maskSelector = VariableInterpolator.interpolateString(m, context);
              return LocatorHelper.createLocator(page, maskSelector, data.selectorType || 'css');
            });
            
            const screenshotTimeout = data.waitForSelectorTimeout || 30000;
            const screenshotOptions: any = { path: data.path, timeout: screenshotTimeout };
            if (maskLocators && maskLocators.length > 0) {
              screenshotOptions.mask = maskLocators;
            }
            
            await locator.screenshot(screenshotOptions);
            screenshotPath = data.path || 'element-screenshot.png';
            break;
            
          case 'pdf':
            if (!data.path) {
              throw new Error('Path is required for PDF generation');
            }
            const pdfPath = VariableInterpolator.interpolateString(data.path, context);
            const pdfOptions: any = {
              path: pdfPath,
              format: data.format || 'A4',
              printBackground: data.printBackground !== false,
              landscape: data.landscape || false,
            };
            if (data.margin) {
              pdfOptions.margin = data.margin;
            }
            await page.pdf(pdfOptions);
            screenshotPath = pdfPath;
            break;
            
          default:
            // Legacy: use fullPage property
            const fullPage = data.fullPage || false;
            screenshotPath = await playwright.takeScreenshot(data.path, fullPage);
            break;
        }
        
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

    // If pause is enabled, pause execution indefinitely until user clicks continue or stop
    if (data.pause === true) {
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
    
    // Handle variable interpolation if value is a string
    let resolvedValue: number = data.value;
    if (typeof data.value === 'string' && (data.value.includes('${data.') || data.value.includes('${variables.'))) {
      const interpolated = VariableInterpolator.interpolateString(data.value, context);
      // Try to parse as integer after interpolation
      const parsed = parseInt(interpolated, 10);
      resolvedValue = isNaN(parsed) ? 0 : parsed;
    } else if (typeof data.value === 'string') {
      // If it's a string but doesn't contain interpolation, try to parse it
      const parsed = parseInt(data.value, 10);
      resolvedValue = isNaN(parsed) ? 0 : parsed;
    }
    
    // Store the resolved value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, resolvedValue);
    
    // Additionally store under custom variableName if provided (for global variable access)
    if (data.variableName && data.variableName.trim()) {
      context.setVariable(data.variableName.trim(), resolvedValue);
    }
    
    // Also store in data for compatibility
    context.setData('value', resolvedValue);
  }
}

export class StringValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as StringValueNodeData;
    
    // Handle variable interpolation
    let resolvedValue: string = data.value || '';
    if (typeof data.value === 'string' && (data.value.includes('${data.') || data.value.includes('${variables.'))) {
      resolvedValue = VariableInterpolator.interpolateString(data.value, context);
    }
    
    // Store the resolved value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, resolvedValue);
    
    // Additionally store under custom variableName if provided (for global variable access)
    if (data.variableName && data.variableName.trim()) {
      context.setVariable(data.variableName.trim(), resolvedValue);
    }
    
    // Also store in data for compatibility
    context.setData('value', resolvedValue);
  }
}

export class BooleanValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as BooleanValueNodeData;
    
    // Handle variable interpolation if value is a string
    let resolvedValue: boolean = data.value;
    if (typeof data.value === 'string' && (data.value.includes('${data.') || data.value.includes('${variables.'))) {
      const interpolated = VariableInterpolator.interpolateString(data.value, context);
      // Convert interpolated string to boolean
      const lowercased = interpolated.toLowerCase().trim();
      resolvedValue = lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
    } else if (typeof data.value === 'string') {
      // If it's a string but doesn't contain interpolation, try to parse it
      const lowercased = data.value.toLowerCase().trim();
      resolvedValue = lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
    }
    
    // Store the resolved value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, resolvedValue);
    
    // Additionally store under custom variableName if provided (for global variable access)
    if (data.variableName && data.variableName.trim()) {
      context.setVariable(data.variableName.trim(), resolvedValue);
    }
    
    // Also store in data for compatibility
    context.setData('value', resolvedValue);
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
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, convertedValue);
    
    // Additionally store under custom variableName if provided (for global variable access)
    if (data.variableName && data.variableName.trim()) {
      context.setVariable(data.variableName.trim(), convertedValue);
    }
    
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

export class StorageHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as StorageNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Storage node');
    }

    const timeout = data.waitForSelectorTimeout || 30000;
    const contextKey = data.contextKey || 'storageResult';

    // Execute storage operation with retry logic (includes wait conditions)
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
            defaultTimeout: timeout,
            waitTiming: 'before',
          }, context);
        }

        let storageResult: any;

        // Execute action based on action type
        switch (data.action) {
          case 'getCookie':
            if (data.name) {
              const name = VariableInterpolator.interpolateString(data.name, context);
              const cookies = await page.context().cookies(data.url ? VariableInterpolator.interpolateString(data.url, context) : undefined);
              const cookie = cookies.find((c: any) => c.name === name);
              storageResult = cookie ? cookie.value : null;
            } else {
              const url = data.url ? VariableInterpolator.interpolateString(data.url, context) : undefined;
              storageResult = await page.context().cookies(url);
            }
            break;

          case 'setCookie':
            if (!data.cookies || !Array.isArray(data.cookies)) {
              throw new Error('Cookies array is required for setCookie action');
            }
            const url = data.url ? VariableInterpolator.interpolateString(data.url, context) : page.url();
            const cookiesToSet = data.cookies.map(cookie => ({
              name: VariableInterpolator.interpolateString(cookie.name, context),
              value: VariableInterpolator.interpolateString(cookie.value, context),
              domain: cookie.domain ? VariableInterpolator.interpolateString(cookie.domain, context) : undefined,
              path: cookie.path,
              expires: cookie.expires,
              httpOnly: cookie.httpOnly,
              secure: cookie.secure,
              sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
              url: url,
            }));
            await page.context().addCookies(cookiesToSet);
            storageResult = cookiesToSet;
            break;

          case 'clearCookies':
            if (data.domain) {
              const domain = VariableInterpolator.interpolateString(data.domain, context);
              const cookies = await page.context().cookies();
              const cookiesToDelete = cookies.filter((c: any) => c.domain === domain || c.domain?.endsWith(`.${domain}`));
              await page.context().clearCookies();
              // Re-add cookies not matching domain
              const cookiesToKeep = cookies.filter((c: any) => !cookiesToDelete.includes(c));
              if (cookiesToKeep.length > 0) {
                await page.context().addCookies(cookiesToKeep);
              }
              storageResult = { deleted: cookiesToDelete.length, kept: cookiesToKeep.length };
            } else {
              await page.context().clearCookies();
              storageResult = { deleted: 'all' };
            }
            break;

          case 'getLocalStorage':
            if (data.key) {
              const key = VariableInterpolator.interpolateString(data.key, context);
              storageResult = await page.evaluate((k: string) => localStorage.getItem(k), key);
            } else {
              storageResult = await page.evaluate(() => {
                const items: Record<string, string> = {};
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key) {
                    items[key] = localStorage.getItem(key) || '';
                  }
                }
                return items;
              });
            }
            break;

          case 'setLocalStorage':
            if (!data.key || data.value === undefined) {
              throw new Error('Key and value are required for setLocalStorage action');
            }
            const setKey = VariableInterpolator.interpolateString(data.key, context);
            const setValue = VariableInterpolator.interpolateString(String(data.value), context);
            await page.evaluate((k: string, v: string) => localStorage.setItem(k, v), setKey, setValue);
            storageResult = { key: setKey, value: setValue };
            break;

          case 'clearLocalStorage':
            await page.evaluate(() => localStorage.clear());
            storageResult = { cleared: true };
            break;

          case 'getSessionStorage':
            if (data.key) {
              const key = VariableInterpolator.interpolateString(data.key, context);
              storageResult = await page.evaluate((k: string) => sessionStorage.getItem(k), key);
            } else {
              storageResult = await page.evaluate(() => {
                const items: Record<string, string> = {};
                for (let i = 0; i < sessionStorage.length; i++) {
                  const key = sessionStorage.key(i);
                  if (key) {
                    items[key] = sessionStorage.getItem(key) || '';
                  }
                }
                return items;
              });
            }
            break;

          case 'setSessionStorage':
            if (!data.key || data.value === undefined) {
              throw new Error('Key and value are required for setSessionStorage action');
            }
            const sessionKey = VariableInterpolator.interpolateString(data.key, context);
            const sessionValue = VariableInterpolator.interpolateString(String(data.value), context);
            await page.evaluate((k: string, v: string) => sessionStorage.setItem(k, v), sessionKey, sessionValue);
            storageResult = { key: sessionKey, value: sessionValue };
            break;

          case 'clearSessionStorage':
            await page.evaluate(() => sessionStorage.clear());
            storageResult = { cleared: true };
            break;

          default:
            throw new Error(`Unknown storage action type: ${data.action}`);
        }

        // Store result in context
        context.setData(contextKey, storageResult);

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
          }, context);
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
      throw new Error(`Storage operation failed silently with action: ${data.action}`);
    }
  }
}

export class DialogHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as DialogNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Dialog node');
    }

    const timeout = data.timeout || 30000;

    // Execute dialog operation with retry logic (includes wait conditions)
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
            defaultTimeout: timeout,
            waitTiming: 'before',
          }, context);
        }

        // Set up dialog listener
        const dialogPromise = new Promise<any>((resolve) => {
          page.once('dialog', (dialog: any) => {
            resolve(dialog);
          });
        });

        // Execute action based on action type
        switch (data.action) {
          case 'accept':
            const acceptDialog = await Promise.race([
              dialogPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Dialog timeout')), timeout))
            ]) as any;
            if (data.message) {
              const expectedMessage = VariableInterpolator.interpolateString(data.message, context);
              if (acceptDialog.message() !== expectedMessage) {
                throw new Error(`Dialog message mismatch. Expected: ${expectedMessage}, Got: ${acceptDialog.message()}`);
              }
            }
            await acceptDialog.accept();
            break;

          case 'dismiss':
            const dismissDialog = await Promise.race([
              dialogPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Dialog timeout')), timeout))
            ]) as any;
            if (data.message) {
              const expectedMessage = VariableInterpolator.interpolateString(data.message, context);
              if (dismissDialog.message() !== expectedMessage) {
                throw new Error(`Dialog message mismatch. Expected: ${expectedMessage}, Got: ${dismissDialog.message()}`);
              }
            }
            await dismissDialog.dismiss();
            break;

          case 'prompt':
            if (!data.inputText) {
              throw new Error('Input text is required for prompt action');
            }
            const promptDialog = await Promise.race([
              dialogPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Dialog timeout')), timeout))
            ]) as any;
            if (data.message) {
              const expectedMessage = VariableInterpolator.interpolateString(data.message, context);
              if (promptDialog.message() !== expectedMessage) {
                throw new Error(`Dialog message mismatch. Expected: ${expectedMessage}, Got: ${promptDialog.message()}`);
              }
            }
            const inputText = VariableInterpolator.interpolateString(data.inputText, context);
            await promptDialog.accept(inputText);
            break;

          case 'waitForDialog':
            const waitDialog = await Promise.race([
              dialogPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Dialog timeout')), timeout))
            ]) as any;
            const dialogMessage = waitDialog.message();
            if (data.message) {
              const expectedPattern = VariableInterpolator.interpolateString(data.message, context);
              const regex = expectedPattern.startsWith('/') && expectedPattern.endsWith('/')
                ? new RegExp(expectedPattern.slice(1, -1))
                : new RegExp(expectedPattern);
              if (!regex.test(dialogMessage)) {
                throw new Error(`Dialog message does not match pattern. Expected: ${expectedPattern}, Got: ${dialogMessage}`);
              }
            }
            const outputVar = data.outputVariable || 'dialogMessage';
            context.setData(outputVar, dialogMessage);
            // Don't accept/dismiss - just wait and capture message
            break;

          default:
            throw new Error(`Unknown dialog action type: ${data.action}`);
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
          }, context);
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
      throw new Error(`Dialog operation failed silently with action: ${data.action}`);
    }
  }
}

export class DownloadHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as DownloadNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Download node');
    }

    const timeout = data.timeout || 30000;

    // Execute download operation with retry logic (includes wait conditions)
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
            defaultTimeout: timeout,
            waitTiming: 'before',
          }, context);
        }

        // Execute action based on action type
        switch (data.action) {
          case 'waitForDownload':
            const downloadPromise = page.waitForEvent('download', { timeout });
            let download: any;
            
            if (data.urlPattern) {
              const pattern = VariableInterpolator.interpolateString(data.urlPattern, context);
              const regex = pattern.startsWith('/') && pattern.endsWith('/')
                ? new RegExp(pattern.slice(1, -1))
                : new RegExp(pattern);
              
              // Wait for download matching URL pattern
              download = await downloadPromise;
              const downloadUrl = download.url();
              if (!regex.test(downloadUrl)) {
                throw new Error(`Download URL does not match pattern. Expected: ${pattern}, Got: ${downloadUrl}`);
              }
            } else {
              download = await downloadPromise;
            }
            
            const outputVar = data.outputVariable || 'download';
            context.setData(outputVar, download);
            break;

          case 'saveDownload':
            if (!data.downloadObject) {
              throw new Error('Download object is required for saveDownload action');
            }
            const downloadObj = context.getData(data.downloadObject);
            if (!downloadObj) {
              throw new Error(`Download object not found in context with key: ${data.downloadObject}`);
            }
            if (!data.savePath) {
              throw new Error('Save path is required for saveDownload action');
            }
            const savePath = VariableInterpolator.interpolateString(data.savePath, context);
            await downloadObj.saveAs(savePath);
            context.setData('downloadSavedPath', savePath);
            break;

          case 'getDownloadPath':
            if (!data.downloadObject) {
              throw new Error('Download object is required for getDownloadPath action');
            }
            const downloadForPath = context.getData(data.downloadObject);
            if (!downloadForPath) {
              throw new Error(`Download object not found in context with key: ${data.downloadObject}`);
            }
            const downloadPath = await downloadForPath.path();
            const pathOutputVar = data.outputVariable || 'downloadPath';
            context.setData(pathOutputVar, downloadPath);
            break;

          default:
            throw new Error(`Unknown download action type: ${data.action}`);
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
          }, context);
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
      throw new Error(`Download operation failed silently with action: ${data.action}`);
    }
  }
}

export class IframeHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as IframeNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.action) {
      throw new Error('Action is required for Iframe node');
    }

    const timeout = data.timeout || 30000;

    // Execute iframe operation with retry logic (includes wait conditions)
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
            defaultTimeout: timeout,
            waitTiming: 'before',
          }, context);
        }

        // Execute action based on action type
        switch (data.action) {
          case 'switchToIframe':
            let frame: any = null;
            
            if (data.selector) {
              const selector = VariableInterpolator.interpolateString(data.selector, context);
              // IframeNodeData doesn't have selectorType, default to CSS
              const locator = LocatorHelper.createLocator(page, selector, 'css');
              frame = await locator.contentFrame();
            } else if (data.name) {
              const name = VariableInterpolator.interpolateString(data.name, context);
              frame = page.frame({ name });
            } else if (data.url) {
              const urlPattern = VariableInterpolator.interpolateString(data.url, context);
              const regex = urlPattern.startsWith('/') && urlPattern.endsWith('/')
                ? new RegExp(urlPattern.slice(1, -1))
                : new RegExp(urlPattern);
              frame = page.frames().find((f: any) => regex.test(f.url()));
            } else {
              // Default: get first iframe
              const frames = page.frames();
              frame = frames.length > 1 ? frames[1] : null; // frames[0] is main frame
            }
            
            if (!frame) {
              throw new Error('Iframe not found');
            }
            
            const contextKey = data.contextKey || 'iframePage';
            context.setData(contextKey, frame);
            // Note: Playwright doesn't have a direct "switch context" - we store frame reference
            // Subsequent operations on this frame should use the stored frame reference
            break;

          case 'switchToMainFrame':
            // Switch back to main frame (just clear iframe reference)
            context.setData('iframePage', undefined);
            break;

          case 'getIframeContent':
            if (!data.iframeSelector || !data.contentSelector) {
              throw new Error('Iframe selector and content selector are required for getIframeContent action');
            }
            const iframeSelector = VariableInterpolator.interpolateString(data.iframeSelector, context);
            const contentSelector = VariableInterpolator.interpolateString(data.contentSelector, context);
            // IframeNodeData doesn't have selectorType, default to CSS
            const iframeLocator = LocatorHelper.createLocator(page, iframeSelector, 'css');
            const iframeFrame = await iframeLocator.contentFrame();
            
            if (!iframeFrame) {
              throw new Error('Iframe not found');
            }
            
            // Content selector within iframe uses CSS (iframeFrame.locator only supports CSS/XPath)
            // For Playwright locator methods, we'd need to use iframeFrame.getByRole, etc.
            // For now, support CSS/XPath only for content within iframe
            const contentLocator = contentSelector.startsWith('xpath=') || contentSelector.startsWith('//')
              ? iframeFrame.locator(`xpath=${contentSelector}`)
              : iframeFrame.locator(contentSelector);
            const content = await contentLocator.textContent({ timeout });
            const outputVar = data.outputVariable || 'iframeContent';
            context.setData(outputVar, content);
            break;

          default:
            throw new Error(`Unknown iframe action type: ${data.action}`);
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
          }, context);
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
      throw new Error(`Iframe operation failed silently with action: ${data.action}`);
    }
  }
}
