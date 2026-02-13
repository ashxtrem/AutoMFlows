import { ActionHandler } from '../action';
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

describe('ActionHandler', () => {
  let handler: ActionHandler;
  let mockPage: any;
  let mockContext: any;
  let mockLocator: any;

  beforeEach(() => {
    handler = new ActionHandler();
    mockPage = createMockPage();
    mockContext = createMockContextManager(mockPage);
    mockLocator = {
      click: jest.fn().mockResolvedValue(undefined),
      dblclick: jest.fn().mockResolvedValue(undefined),
      hover: jest.fn().mockResolvedValue(undefined),
      dragTo: jest.fn().mockResolvedValue(undefined),
      boundingBox: jest.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 }),
    };
    mockPage.mouse = {
      move: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
      up: jest.fn().mockResolvedValue(undefined),
    };
    mockPage.waitForTimeout = jest.fn().mockResolvedValue(undefined);

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
      const targetLocator = { dragTo: jest.fn().mockResolvedValue(undefined) };
      (LocatorHelper.createLocator as jest.Mock).mockImplementation((page: any, selector: string) => {
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

    it('should interpolate selector variables', async () => {
      (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => {
        if (str === '${selector}') return '#interpolated';
        return str;
      });

      const node = createMockNode(NodeType.ACTION, {
        selector: '${selector}',
        action: 'click',
      });

      await handler.execute(node, mockContext);

      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#interpolated', 'css');
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
  });
});
