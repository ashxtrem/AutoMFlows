import { BaseNode, DownloadNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { WaitHelper } from '../../utils/waitHelper';
import { RetryHelper } from '../../utils/retryHelper';
import { VariableInterpolator } from '../../utils/variableInterpolator';

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
      throw new Error(`Download operation failed silently with action: ${data.action}`);
    }
  }
}
