import { ElementQueryHandler } from '../elementQuery';
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

describe('ElementQueryHandler', () => {
  let handler: ElementQueryHandler;
  let mockPage: any;
  let mockContext: any;
  let mockLocator: any;

  beforeEach(() => {
    handler = new ElementQueryHandler();
    mockPage = createMockPage();
    mockContext = createMockContextManager(mockPage);
    // Spy on setData to verify it's called
    jest.spyOn(mockContext, 'setData');
    mockLocator = {
      textContent: jest.fn().mockResolvedValue('test text'),
      getAttribute: jest.fn().mockResolvedValue('value'),
      count: jest.fn().mockResolvedValue(5),
      waitFor: jest.fn().mockResolvedValue(undefined),
      isEnabled: jest.fn().mockResolvedValue(true),
      isChecked: jest.fn().mockResolvedValue(false),
      boundingBox: jest.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 }),
      all: jest.fn().mockResolvedValue([
        { textContent: jest.fn().mockResolvedValue('text1') },
        { textContent: jest.fn().mockResolvedValue('text2') },
      ]),
    };

    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str);
    (LocatorHelper.createLocator as jest.Mock).mockReturnValue(mockLocator);
    (LocatorHelper.scrollToElementSmooth as jest.Mock).mockResolvedValue(undefined);
    (WaitHelper.executeWaits as jest.Mock).mockResolvedValue(undefined);
    (RetryHelper.executeWithRetry as jest.Mock).mockImplementation(async (fn: () => Promise<any>) => {
      const result = await fn();
      return result;
    });
    (RetryHelper.interpolateRetryOptions as jest.Mock).mockReturnValue({ enabled: false });
  });

  describe('execute', () => {
    it('should throw error when page is not available', async () => {
      const contextWithoutPage = createMockContextManager();
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'getText',
      });

      await expect(handler.execute(node, contextWithoutPage)).rejects.toThrow(
        'No page available. Ensure Open Browser node is executed first.'
      );
    });

    it('should throw error when selector is missing', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        action: 'getText',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Selector is required for Element Query node'
      );
    });

    it('should throw error when action is missing', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Action is required for Element Query node'
      );
    });

    it('should execute getText action', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'getText',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.textContent).toHaveBeenCalledWith({ timeout: 30000 });
      expect(mockContext.setData).toHaveBeenCalledWith('text', 'test text');
    });

    it('should execute getAttribute action', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'getAttribute',
        attributeName: 'href',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.getAttribute).toHaveBeenCalledWith('href', { timeout: 30000 });
      expect(mockContext.setData).toHaveBeenCalledWith('attribute', 'value');
    });

    it('should throw error for getAttribute without attributeName', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'getAttribute',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Attribute name is required for getAttribute action'
      );
    });

    it('should execute getCount action', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'getCount',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.count).toHaveBeenCalled();
      expect(mockContext.setData).toHaveBeenCalledWith('count', 5);
    });

    it('should execute isVisible action', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'isVisible',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 30000 });
      expect(mockContext.setData).toHaveBeenCalledWith('isVisible', true);
    });

    it('should execute isEnabled action', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'isEnabled',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.isEnabled).toHaveBeenCalledWith({ timeout: 30000 });
      expect(mockContext.setData).toHaveBeenCalledWith('isEnabled', true);
    });

    it('should execute isChecked action', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'isChecked',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.isChecked).toHaveBeenCalledWith({ timeout: 30000 });
      expect(mockContext.setData).toHaveBeenCalledWith('isChecked', false);
    });

    it('should execute getBoundingBox action', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'getBoundingBox',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.boundingBox).toHaveBeenCalledWith({ timeout: 30000 });
      expect(mockContext.setData).toHaveBeenCalledWith('boundingBox', { x: 0, y: 0, width: 100, height: 100 });
    });

    it('should execute getAllText action', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'getAllText',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.all).toHaveBeenCalled();
      expect(mockContext.setData).toHaveBeenCalledWith('text', ['text1', 'text2']);
    });

    it('should use custom outputVariable', async () => {
      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '#element',
        action: 'getText',
        outputVariable: 'customVar',
      });

      await handler.execute(node, mockContext);

      expect(mockContext.setData).toHaveBeenCalledWith('customVar', 'test text');
    });

    it('should interpolate selector variables', async () => {
      (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => {
        if (str === '${selector}') return '#interpolated';
        return str;
      });

      const node = createMockNode(NodeType.ELEMENT_QUERY, {
        selector: '${selector}',
        action: 'getText',
      });

      await handler.execute(node, mockContext);

      expect(LocatorHelper.createLocator).toHaveBeenCalledWith(mockPage, '#interpolated', 'css', undefined);
    });
  });
});
