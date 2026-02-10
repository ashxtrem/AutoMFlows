import { WaitHandler } from '../wait';
import { NodeType } from '@automflows/shared';
import { createMockPage, createMockContextManager, createMockNode } from '../../../__tests__/helpers/mocks';
import { WaitHelper } from '../../../utils/waitHelper';
import { RetryHelper } from '../../../utils/retryHelper';
import { VariableInterpolator } from '../../../utils/variableInterpolator';
import { LocatorHelper } from '../../../utils/locatorHelper';

jest.mock('../../../utils/waitHelper');
jest.mock('../../../utils/retryHelper');
jest.mock('../../../utils/variableInterpolator');
jest.mock('../../../utils/locatorHelper');

describe('WaitHandler', () => {
  let handler: WaitHandler;
  let mockPage: any;
  let mockContext: any;
  let mockLocator: any;

  beforeEach(() => {
    handler = new WaitHandler();
    mockPage = createMockPage();
    mockPage.waitForTimeout = jest.fn().mockResolvedValue(undefined);
    mockContext = createMockContextManager(mockPage);
    mockLocator = {
      waitFor: jest.fn().mockResolvedValue(undefined),
    };

    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str);
    (LocatorHelper.createLocator as jest.Mock).mockReturnValue(mockLocator);
    (WaitHelper.waitForUrl as jest.Mock).mockResolvedValue(undefined);
    (WaitHelper.waitForCondition as jest.Mock).mockResolvedValue(undefined);
    (RetryHelper.executeWithRetry as jest.Mock).mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
      return undefined;
    });
    (RetryHelper.interpolateRetryOptions as jest.Mock).mockReturnValue({ enabled: false });
  });

  describe('execute', () => {
    it('should execute timeout wait', async () => {
      const node = createMockNode(NodeType.WAIT, {
        waitType: 'timeout',
        value: 1000,
      });

      await handler.execute(node, mockContext);

      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should execute selector wait', async () => {
      const node = createMockNode(NodeType.WAIT, {
        waitType: 'selector',
        value: '#element',
        timeout: 5000,
      });

      await handler.execute(node, mockContext);

      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#element', 'css');
      expect(mockLocator.waitFor).toHaveBeenCalledWith({ timeout: 5000, state: 'visible' });
    });

    it('should throw error for selector wait without page', async () => {
      const contextWithoutPage = createMockContextManager();
      const node = createMockNode(NodeType.WAIT, {
        waitType: 'selector',
        value: '#element',
      });

      await expect(handler.execute(node, contextWithoutPage)).rejects.toThrow(
        'Page is required for selector wait'
      );
    });

    it('should execute URL wait', async () => {
      const node = createMockNode(NodeType.WAIT, {
        waitType: 'url',
        value: 'https://example.com',
        timeout: 5000,
      });

      await handler.execute(node, mockContext);

      expect(WaitHelper.waitForUrl).toHaveBeenCalledWith(
        mockPage,
        'https://example.com',
        5000,
        false,
        'before'
      );
    });

    it('should execute condition wait', async () => {
      const node = createMockNode(NodeType.WAIT, {
        waitType: 'condition',
        value: 'document.readyState === "complete"',
        timeout: 5000,
      });

      await handler.execute(node, mockContext);

      expect(WaitHelper.waitForCondition).toHaveBeenCalledWith(
        mockPage,
        'document.readyState === "complete"',
        5000,
        false,
        'before'
      );
    });

    it('should execute API response wait with status check', async () => {
      mockContext.setData('apiResponse', {
        status: 200,
        body: {},
        headers: {},
      });

      const node = createMockNode(NodeType.WAIT, {
        waitType: 'api-response',
        value: 'apiResponse',
        apiWaitConfig: {
          checkType: 'status',
          expectedValue: 200,
          matchType: 'equals',
        },
      });

      await handler.execute(node, mockContext);
    });

    it('should throw error for invalid wait type', async () => {
      const node = createMockNode(NodeType.WAIT, {
        waitType: 'invalid' as any,
        value: 'test',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Invalid wait type'
      );
    });

    it('should handle pause before wait', async () => {
      const pauseExecution = jest.fn().mockResolvedValue(undefined);
      const getCurrentNodeId = jest.fn().mockReturnValue('node-id');
      mockContext.setData('pauseExecution', pauseExecution);
      mockContext.setData('getCurrentNodeId', getCurrentNodeId);

      const node = createMockNode(NodeType.WAIT, {
        waitType: 'timeout',
        value: 1000,
        pause: true,
      });

      await handler.execute(node, mockContext);

      expect(pauseExecution).toHaveBeenCalledWith('node-id', 'wait-pause');
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });
  });
});
