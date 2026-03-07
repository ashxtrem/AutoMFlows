import { ActionHandler } from '../action';
import { NodeType } from '@automflows/shared';
import { createMockPage, createMockContextManager, createMockNode } from '../../../__tests__/helpers/mocks';
import { WaitHelper } from '../../../utils/waitHelper';
import { RetryHelper } from '../../../utils/retryHelper';

jest.mock('../../../utils/waitHelper');
jest.mock('../../../utils/retryHelper');
jest.mock('../../../utils/textSelectorResolver', () => ({
  TextSelectorResolver: {
    resolve: jest.fn().mockImplementation(async (page: any, text: string) => page.locator(text)),
  },
}));

describe('ActionHandler', () => {
  let handler: ActionHandler;
  let mockPage: any;
  let mockContext: any;
  let mockLocator: any;

  beforeEach(() => {
    handler = new ActionHandler();
    mockPage = createMockPage();
    mockLocator = {
      click: jest.fn().mockResolvedValue(undefined),
      dblclick: jest.fn().mockResolvedValue(undefined),
      hover: jest.fn().mockResolvedValue(undefined),
      dragTo: jest.fn().mockResolvedValue(undefined),
      boundingBox: jest.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 }),
      filter: jest.fn().mockReturnThis(),
      nth: jest.fn().mockReturnThis(),
      locator: jest.fn().mockReturnThis(),
      scrollIntoViewIfNeeded: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(undefined),
    };
    mockPage.locator.mockReturnValue(mockLocator);
    mockPage.viewportSize = jest.fn().mockReturnValue({ width: 1280, height: 720 });
    mockPage.mouse = {
      move: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
      up: jest.fn().mockResolvedValue(undefined),
    };
    mockPage.waitForTimeout = jest.fn().mockResolvedValue(undefined);
    mockContext = createMockContextManager(mockPage);

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
      const node = createMockNode(NodeType.ACTION, {
        selector: '#button',
        action: 'click',
      });

      await expect(handler.execute(node, contextWithoutPage)).rejects.toThrow(
        'No page available. Ensure Open Browser node is executed first.'
      );
    });

    it('should throw error when selector is missing', async () => {
      const node = createMockNode(NodeType.ACTION, {
        action: 'click',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Selector is required for Action node'
      );
    });

    it('should throw error when action is missing', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#button',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Action is required for Action node'
      );
    });

    it('should execute click action', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#button',
        action: 'click',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.click).toHaveBeenCalledWith({ button: 'left', timeout: 30000 });
    });

    it('should execute doubleClick action', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#button',
        action: 'doubleClick',
        delay: 100,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.dblclick).toHaveBeenCalledWith({ timeout: 30000 });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(100);
    });

    it('should execute rightClick action', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#button',
        action: 'rightClick',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.click).toHaveBeenCalledWith({ button: 'right', timeout: 30000 });
    });

    it('should execute hover action', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#button',
        action: 'hover',
        delay: 200,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.hover).toHaveBeenCalledWith({ timeout: 30000 });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(200);
    });

    it('should execute dragAndDrop to target selector', async () => {
      const targetLocator = {
        dragTo: jest.fn().mockResolvedValue(undefined),
        filter: jest.fn().mockReturnThis(),
        nth: jest.fn().mockReturnThis(),
        locator: jest.fn().mockReturnThis(),
      };
      mockPage.locator.mockImplementation((selector: string) => {
        if (selector === '#target') return targetLocator;
        return mockLocator;
      });

      const node = createMockNode(NodeType.ACTION, {
        selector: '#source',
        action: 'dragAndDrop',
        targetSelector: '#target',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.dragTo).toHaveBeenCalledWith(targetLocator, { timeout: 30000 });
    });

    it('should execute dragAndDrop to coordinates', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#source',
        action: 'dragAndDrop',
        targetX: 100,
        targetY: 200,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.boundingBox).toHaveBeenCalled();
      expect(mockPage.mouse.move).toHaveBeenCalledWith(50, 50); // center of 100x100 box
      expect(mockPage.mouse.down).toHaveBeenCalled();
      expect(mockPage.mouse.move).toHaveBeenCalledWith(100, 200);
      expect(mockPage.mouse.up).toHaveBeenCalled();
    });

    it('should throw error for dragAndDrop without target', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#source',
        action: 'dragAndDrop',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Target selector or target coordinates'
      );
    });

    it('should throw error for unknown action', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#button',
        action: 'unknown' as any,
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Unknown action type'
      );
    });

    it('should interpolate selector variables via real VariableInterpolator', async () => {
      mockContext.setVariable('selector', '#interpolated');

      const node = createMockNode(NodeType.ACTION, {
        selector: '${variables.selector}',
        action: 'click',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.locator).toHaveBeenCalledWith('#interpolated');
      expect(mockLocator.click).toHaveBeenCalled();
    });

    it('should use custom timeout', async () => {
      const node = createMockNode(NodeType.ACTION, {
        selector: '#button',
        action: 'click',
        timeout: 5000,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.click).toHaveBeenCalledWith({ button: 'left', timeout: 5000 });
    });

    it('should resolve text selectorType via TextSelectorResolver', async () => {
      const { TextSelectorResolver } = require('../../../utils/textSelectorResolver');
      const node = createMockNode(NodeType.ACTION, {
        selector: 'Submit',
        action: 'click',
        selectorType: 'text',
      });

      await handler.execute(node, mockContext);

      expect(TextSelectorResolver.resolve).toHaveBeenCalledWith(mockPage, 'Submit', undefined);
      expect(mockLocator.click).toHaveBeenCalled();
    });
  });
});
