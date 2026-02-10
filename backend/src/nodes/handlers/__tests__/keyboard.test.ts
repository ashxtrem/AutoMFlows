import { KeyboardHandler } from '../keyboard';
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

describe('KeyboardHandler', () => {
  let handler: KeyboardHandler;
  let mockPage: any;
  let mockContext: any;
  let mockLocator: any;

  beforeEach(() => {
    handler = new KeyboardHandler();
    mockPage = createMockPage();
    mockContext = createMockContextManager(mockPage);
    mockLocator = {
      press: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined),
      focus: jest.fn().mockResolvedValue(undefined),
    };
    mockPage.keyboard = {
      press: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      insertText: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
      up: jest.fn().mockResolvedValue(undefined),
    };

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
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'press',
        key: 'Enter',
      });

      await expect(handler.execute(node, contextWithoutPage)).rejects.toThrow(
        'No page available. Ensure Open Browser node is executed first.'
      );
    });

    it('should throw error when action is missing', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {});

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Action is required for Keyboard node'
      );
    });

    it('should execute press action without selector', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'press',
        key: 'Enter',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
    });

    it('should execute press action with selector', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'press',
        key: 'Enter',
        selector: '#input',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.focus).toHaveBeenCalled();
      expect(mockLocator.press).toHaveBeenCalledWith('Enter', { timeout: 30000 });
    });

    it('should throw error for press without key', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'press',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Key is required for press action'
      );
    });

    it('should execute type action without selector', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'type',
        text: 'test text',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.keyboard.type).toHaveBeenCalledWith('test text');
    });

    it('should execute type action with selector and delay', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'type',
        text: 'test text',
        selector: '#input',
        delay: 100,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.type).toHaveBeenCalledWith('test text', { delay: 100, timeout: 30000 });
    });

    it('should clear field before typing when clearFirst is true', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'type',
        text: 'test text',
        selector: '#input',
        clearFirst: true,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.fill).toHaveBeenCalledWith('', { timeout: 30000 });
      expect(mockLocator.type).toHaveBeenCalledWith('test text', { timeout: 30000 });
    });

    it('should throw error for type without text', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'type',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Text is required for type action'
      );
    });

    it('should execute insertText action', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'insertText',
        text: 'inserted text',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.keyboard.insertText).toHaveBeenCalledWith('inserted text');
    });

    it('should execute insertText with selector', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'insertText',
        text: 'inserted text',
        selector: '#input',
        clearFirst: true,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.fill).toHaveBeenCalledWith('', { timeout: 30000 });
      expect(mockLocator.fill).toHaveBeenCalledWith('inserted text', { timeout: 30000 });
    });

    it('should execute shortcut action', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'shortcut',
        shortcut: 'Control+C',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Control+C');
    });

    it('should throw error for shortcut without shortcut', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'shortcut',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Shortcut is required for shortcut action'
      );
    });

    it('should execute down action', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'down',
        key: 'Shift',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.keyboard.down).toHaveBeenCalledWith('Shift');
    });

    it('should execute up action', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'up',
        key: 'Shift',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.keyboard.up).toHaveBeenCalledWith('Shift');
    });

    it('should throw error for unknown action', async () => {
      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'unknown' as any,
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Unknown keyboard action type'
      );
    });

    it('should interpolate variables', async () => {
      (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => {
        if (str === '${key}') return 'Enter';
        return str;
      });

      const node = createMockNode(NodeType.KEYBOARD, {
        action: 'press',
        key: '${key}',
      });

      await handler.execute(node, mockContext);

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
    });
  });
});
