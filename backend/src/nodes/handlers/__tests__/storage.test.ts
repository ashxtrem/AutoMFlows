import { StorageHandler } from '../storage';
import { NodeType } from '@automflows/shared';
import { createMockPage, createMockContextManager, createMockNode } from '../../../__tests__/helpers/mocks';
import { WaitHelper } from '../../../utils/waitHelper';
import { RetryHelper } from '../../../utils/retryHelper';
import { VariableInterpolator } from '../../../utils/variableInterpolator';

jest.mock('../../../utils/waitHelper');
jest.mock('../../../utils/retryHelper');
jest.mock('../../../utils/variableInterpolator');

describe('StorageHandler', () => {
  let handler: StorageHandler;
  let mockPage: any;
  let mockContext: any;
  let mockBrowserContext: any;

  beforeEach(() => {
    handler = new StorageHandler();
    mockPage = createMockPage();
    mockBrowserContext = {
      pages: jest.fn().mockReturnValue([mockPage]),
      cookies: jest.fn().mockResolvedValue([]),
      addCookies: jest.fn().mockResolvedValue(undefined),
      clearCookies: jest.fn().mockResolvedValue(undefined),
    };
    mockPage.context = jest.fn().mockReturnValue(mockBrowserContext);
    mockPage.evaluate = jest.fn().mockResolvedValue(undefined);
    mockPage.url = jest.fn().mockReturnValue('https://example.com');
    mockContext = createMockContextManager(mockPage);
    // Spy on setData to verify it's called
    jest.spyOn(mockContext, 'setData');

    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str);
    (WaitHelper.executeWaits as jest.Mock).mockResolvedValue(undefined);
    (RetryHelper.executeWithRetry as jest.Mock).mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
      return undefined;
    });
    (RetryHelper.interpolateRetryOptions as jest.Mock).mockReturnValue({ enabled: false });
  });

  describe('execute', () => {
    it('should throw error when page is not available', async () => {
      const contextWithoutPage = createMockContextManager();
      const node = createMockNode(NodeType.STORAGE, {
        action: 'getCookie',
      });

      await expect(handler.execute(node, contextWithoutPage)).rejects.toThrow(
        'No page available. Ensure Open Browser node is executed first.'
      );
    });

    it('should throw error when action is missing', async () => {
      const node = createMockNode(NodeType.STORAGE, {});

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Action is required for Storage node'
      );
    });

    it('should execute getCookie with name', async () => {
      mockBrowserContext.cookies.mockResolvedValue([
        { name: 'test', value: 'value' },
      ]);

      const node = createMockNode(NodeType.STORAGE, {
        action: 'getCookie',
        name: 'test',
      });

      await handler.execute(node, mockContext);

      expect(mockBrowserContext.cookies).toHaveBeenCalled();
      expect(mockContext.setData).toHaveBeenCalledWith('storageResult', 'value');
    });

    it('should execute getCookie without name', async () => {
      mockBrowserContext.cookies.mockResolvedValue([
        { name: 'test', value: 'value' },
      ]);

      const node = createMockNode(NodeType.STORAGE, {
        action: 'getCookie',
      });

      await handler.execute(node, mockContext);

      expect(mockContext.setData).toHaveBeenCalledWith('storageResult', [{ name: 'test', value: 'value' }]);
    });

    it('should execute setCookie', async () => {
      const node = createMockNode(NodeType.STORAGE, {
        action: 'setCookie',
        cookies: [
          { name: 'test', value: 'value' },
        ],
      });

      await handler.execute(node, mockContext);

      expect(mockBrowserContext.addCookies).toHaveBeenCalled();
    });

    it('should throw error for setCookie without cookies', async () => {
      const node = createMockNode(NodeType.STORAGE, {
        action: 'setCookie',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Cookies array is required for setCookie action'
      );
    });

    it('should execute clearCookies', async () => {
      const node = createMockNode(NodeType.STORAGE, {
        action: 'clearCookies',
      });

      await handler.execute(node, mockContext);

      expect(mockBrowserContext.clearCookies).toHaveBeenCalled();
      expect(mockContext.setData).toHaveBeenCalledWith('storageResult', { deleted: 'all' });
    });

    it('should execute getLocalStorage with key', async () => {
      mockPage.evaluate.mockResolvedValue('stored-value');

      const node = createMockNode(NodeType.STORAGE, {
        action: 'getLocalStorage',
        key: 'testKey',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockContext.setData).toHaveBeenCalledWith('storageResult', 'stored-value');
    });

    it('should execute setLocalStorage', async () => {
      const node = createMockNode(NodeType.STORAGE, {
        action: 'setLocalStorage',
        key: 'testKey',
        value: 'testValue',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockContext.setData).toHaveBeenCalledWith('storageResult', { key: 'testKey', value: 'testValue' });
    });

    it('should throw error for setLocalStorage without key', async () => {
      const node = createMockNode(NodeType.STORAGE, {
        action: 'setLocalStorage',
        value: 'testValue',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Key and value are required for setLocalStorage action'
      );
    });

    it('should execute clearLocalStorage', async () => {
      const node = createMockNode(NodeType.STORAGE, {
        action: 'clearLocalStorage',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockContext.setData).toHaveBeenCalledWith('storageResult', { cleared: true });
    });

    it('should use custom contextKey', async () => {
      mockBrowserContext.cookies.mockResolvedValue([]);

      const node = createMockNode(NodeType.STORAGE, {
        action: 'getCookie',
        contextKey: 'customKey',
      });

      await handler.execute(node, mockContext);

      expect(mockContext.setData).toHaveBeenCalledWith('customKey', []);
    });
  });
});
