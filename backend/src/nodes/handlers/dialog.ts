import { BaseNode, DialogNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';

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
            waitForSelectorModifiers: data.waitForSelectorModifiers,
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
            waitForSelectorModifiers: data.waitForSelectorModifiers,
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
      throw new Error(`Dialog operation failed silently with action: ${data.action}`);
    }
  }
}
