import { BaseNode, VerifyNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { RetryHelper } from '../../utils/retryHelper';
import { verificationStrategyRegistry } from '../verification/strategies';

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
          RetryHelper.interpolateRetryOptions({
            enabled: data.retryEnabled || false,
            strategy: data.retryStrategy || 'count',
            count: data.retryCount,
            untilCondition: data.retryUntilCondition,
            delay: data.retryDelay || 1000,
            delayStrategy: data.retryDelayStrategy || 'fixed',
            maxDelay: data.retryMaxDelay,
            failSilently: false, // Don't let RetryHelper handle failSilently, we handle it here
          }, context),
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
