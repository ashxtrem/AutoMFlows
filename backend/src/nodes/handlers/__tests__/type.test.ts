import { TypeHandler } from '../type';
import { NodeType } from '@automflows/shared';
import { createMockPage, createMockContextManager, createMockNode } from '../../../__tests__/helpers/mocks';
import { WaitHelper } from '../../../utils/waitHelper';
import { RetryHelper } from '../../../utils/retryHelper';
import { VariableInterpolator } from '../../../utils/variableInterpolator';
import { LocatorHelper } from '../../../utils/locatorHelper';

// Mock dependencies
jest.mock('../../../utils/waitHelper');
jest.mock('../../../utils/retryHelper');
jest.mock('../../../utils/variableInterpolator');
jest.mock('../../../utils/locatorHelper');

describe('TypeHandler', () => {
  let handler: TypeHandler;
  let mockPage: any;
  let mockContext: any;
  let mockLocator: any;

  beforeEach(() => {
    handler = new TypeHandler();
    mockPage = createMockPage();
    mockContext = createMockContextManager(mockPage);
    mockLocator = {
      fill: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      pressSequentially: jest.fn().mockResolvedValue(undefined),
      inputValue: jest.fn().mockResolvedValue(''),
      evaluate: jest.fn().mockResolvedValue(undefined),
    };

    // Setup default mocks
    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str);
    (LocatorHelper.createLocator as jest.Mock).mockReturnValue(mockLocator);
    (LocatorHelper.scrollToElementSmooth as jest.Mock).mockResolvedValue(undefined);
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
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test',
      });

      await expect(handler.execute(node, contextWithoutPage)).rejects.toThrow(
        'No page available. Ensure Open Browser node is executed first.'
      );
    });

    it('should throw error when selector is missing', async () => {
      const node = createMockNode(NodeType.TYPE, {
        text: 'test',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Selector is required for Type node'
      );
    });

    it('should throw error when text is missing', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Text is required for Type node'
      );
    });

    it('should execute fill method by default', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test text',
      });

      await handler.execute(node, mockContext);

      expect(VariableInterpolator.interpolateString).toHaveBeenCalledWith('#input', mockContext);
      expect(VariableInterpolator.interpolateString).toHaveBeenCalledWith('test text', mockContext);
      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#input', 'css', undefined);
      expect(mockLocator.fill).toHaveBeenCalledWith('test text', { timeout: 30000 });
    });

    it('should execute type method when inputMethod is type', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test text',
        inputMethod: 'type',
        delay: 100,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.type).toHaveBeenCalledWith('test text', { delay: 100, timeout: 30000 });
    });

    it('should clear field before typing when clearFirst is true', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test text',
        inputMethod: 'type',
        clearFirst: true,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.fill).toHaveBeenCalledWith('', { timeout: 30000 });
      expect(mockLocator.type).toHaveBeenCalledWith('test text', { delay: 0, timeout: 30000 });
    });

    it('should execute pressSequentially method', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test text',
        inputMethod: 'pressSequentially',
        delay: 50,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.pressSequentially).toHaveBeenCalledWith('test text', { delay: 50, timeout: 30000 });
    });

    it('should execute append method', async () => {
      mockLocator.inputValue.mockResolvedValue('existing');
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: ' appended',
        inputMethod: 'append',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.inputValue).toHaveBeenCalled();
      expect(mockLocator.fill).toHaveBeenCalledWith('existing appended', { timeout: 30000 });
    });

    it('should execute prepend method', async () => {
      mockLocator.inputValue.mockResolvedValue('existing');
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'prepended ',
        inputMethod: 'prepend',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.fill).toHaveBeenCalledWith('prepended existing', { timeout: 30000 });
    });

    it('should execute direct method', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'direct value',
        inputMethod: 'direct',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.evaluate).toHaveBeenCalled();
    });

    it('should interpolate selector and text variables', async () => {
      (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => {
        if (str === '${selector}') return '#interpolated';
        if (str === '${text}') return 'interpolated text';
        return str;
      });

      const node = createMockNode(NodeType.TYPE, {
        selector: '${selector}',
        text: '${text}',
      });

      await handler.execute(node, mockContext);

      expect(VariableInterpolator.interpolateString).toHaveBeenCalledWith('${selector}', mockContext);
      expect(VariableInterpolator.interpolateString).toHaveBeenCalledWith('${text}', mockContext);
      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#interpolated', 'css', undefined);
      expect(mockLocator.fill).toHaveBeenCalledWith('interpolated text', { timeout: 30000 });
    });

    it('should execute waits before operation when waitAfterOperation is false', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test',
        waitAfterOperation: false,
        waitForSelector: '#wait-element',
      });

      await handler.execute(node, mockContext);

      expect(WaitHelper.executeWaits).toHaveBeenCalledWith(
        mockPage,
        expect.objectContaining({
          waitForSelector: '#wait-element',
          waitTiming: 'before',
        }),
        mockContext
      );
    });

    it('should execute waits after operation when waitAfterOperation is true', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test',
        waitAfterOperation: true,
        waitForSelector: '#wait-element',
      });

      await handler.execute(node, mockContext);

      expect(WaitHelper.executeWaits).toHaveBeenCalledWith(
        mockPage,
        expect.objectContaining({
          waitForSelector: '#wait-element',
          waitTiming: 'after',
        }),
        mockContext
      );
    });

    it('should scroll to element when scrollThenAction is enabled', async () => {
      mockContext.setData('scrollThenAction', true);
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test',
      });

      await handler.execute(node, mockContext);

      expect(LocatorHelper.scrollToElementSmooth).toHaveBeenCalledWith(
        mockPage,
        '#input',
        'css',
        30000,
        undefined
      );
    });

    it('should use custom timeout', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test',
        timeout: 5000,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.fill).toHaveBeenCalledWith('test', { timeout: 5000 });
    });

    it('should use custom selectorType', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test',
        selectorType: 'xpath',
      });

      await handler.execute(node, mockContext);

      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#input', 'xpath', undefined);
    });

    it('should handle retry logic', async () => {
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test',
        retryEnabled: true,
        retryCount: 3,
        retryDelay: 1000,
      });

      await handler.execute(node, mockContext);

      expect(RetryHelper.interpolateRetryOptions).toHaveBeenCalled();
      expect(RetryHelper.executeWithRetry).toHaveBeenCalled();
    });

    it('should throw error on failSilently when result is undefined', async () => {
      (RetryHelper.executeWithRetry as jest.Mock).mockResolvedValue(undefined);
      const node = createMockNode(NodeType.TYPE, {
        selector: '#input',
        text: 'test',
        failSilently: true,
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Type operation failed silently on selector: #input'
      );
    });
  });
});
