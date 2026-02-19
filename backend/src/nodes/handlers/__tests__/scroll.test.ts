import { ScrollHandler } from '../scroll';
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

describe('ScrollHandler', () => {
  let handler: ScrollHandler;
  let mockPage: any;
  let mockContext: any;
  let mockLocator: any;

  beforeEach(() => {
    handler = new ScrollHandler();
    mockPage = createMockPage();
    mockContext = createMockContextManager(mockPage);
    mockLocator = {
      scrollIntoViewIfNeeded: jest.fn().mockResolvedValue(undefined),
    };
    mockPage.evaluate = jest.fn().mockResolvedValue(undefined);

    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str);
    (LocatorHelper.createLocator as jest.Mock).mockReturnValue(mockLocator);
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
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToTop',
      });

      await expect(handler.execute(node, contextWithoutPage)).rejects.toThrow(
        'No page available. Ensure Open Browser node is executed first.'
      );
    });

    it('should throw error when action is missing', async () => {
      const node = createMockNode(NodeType.SCROLL, {});

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Action is required for Scroll node'
      );
    });

    it('should execute scrollToElement action', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToElement',
        selector: '#element',
      });

      await handler.execute(node, mockContext);

      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#element', 'css', undefined);
      expect(mockLocator.scrollIntoViewIfNeeded).toHaveBeenCalledWith({ timeout: 30000 });
    });

    it('should throw error for scrollToElement without selector', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToElement',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Selector is required for scrollToElement action'
      );
    });

    it('should execute scrollToPosition action', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToPosition',
        x: 100,
        y: 200,
      });

      await handler.execute(node, mockContext);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), 100, 200);
    });

    it('should throw error for scrollToPosition without coordinates', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToPosition',
        x: 100,
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'x and y coordinates are required'
      );
    });

    it('should execute scrollBy action', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollBy',
        deltaX: 50,
        deltaY: 100,
      });

      await handler.execute(node, mockContext);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), 50, 100);
    });

    it('should throw error for scrollBy without deltas', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollBy',
        deltaX: 50,
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'deltaX and deltaY are required'
      );
    });

    it('should execute scrollToTop action', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToTop',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should execute scrollToBottom action', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToBottom',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should throw error for unknown action', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'unknown' as any,
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Unknown scroll action type'
      );
    });

    it('should interpolate selector variables', async () => {
      (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => {
        if (str === '${selector}') return '#interpolated';
        return str;
      });

      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToElement',
        selector: '${selector}',
      });

      await handler.execute(node, mockContext);

      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#interpolated', 'css', undefined);
    });

    it('should use custom selectorType', async () => {
      const node = createMockNode(NodeType.SCROLL, {
        action: 'scrollToElement',
        selector: '#element',
        selectorType: 'xpath',
      });

      await handler.execute(node, mockContext);

      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#element', 'xpath', undefined);
    });
  });
});
