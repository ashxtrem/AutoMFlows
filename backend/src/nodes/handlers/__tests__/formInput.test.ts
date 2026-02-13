import { FormInputHandler } from '../formInput';
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

describe('FormInputHandler', () => {
  let handler: FormInputHandler;
  let mockPage: any;
  let mockContext: any;
  let mockLocator: any;

  beforeEach(() => {
    handler = new FormInputHandler();
    mockPage = createMockPage();
    mockContext = createMockContextManager(mockPage);
    mockLocator = {
      selectOption: jest.fn().mockResolvedValue(undefined),
      check: jest.fn().mockResolvedValue(undefined),
      uncheck: jest.fn().mockResolvedValue(undefined),
      setChecked: jest.fn().mockResolvedValue(undefined),
      setInputFiles: jest.fn().mockResolvedValue(undefined),
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
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#select',
        action: 'select',
      });

      await expect(handler.execute(node, contextWithoutPage)).rejects.toThrow(
        'No page available. Ensure Open Browser node is executed first.'
      );
    });

    it('should throw error when selector is missing', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        action: 'select',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Selector is required for Form Input node'
      );
    });

    it('should throw error when action is missing', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#select',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Action is required for Form Input node'
      );
    });

    it('should execute select action with value', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#select',
        action: 'select',
        values: 'option1',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.selectOption).toHaveBeenCalledWith('option1', { timeout: 30000 });
    });

    it('should execute select action with array of values', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#select',
        action: 'select',
        values: ['option1', 'option2'],
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.selectOption).toHaveBeenCalledWith(['option1', 'option2'], { timeout: 30000 });
    });

    it('should execute select action with label', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#select',
        action: 'select',
        values: 'Option Label',
        selectBy: 'label',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.selectOption).toHaveBeenCalledWith({ label: 'Option Label' }, { timeout: 30000 });
    });

    it('should execute select action with index', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#select',
        action: 'select',
        values: '0',
        selectBy: 'index',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.selectOption).toHaveBeenCalledWith({ index: 0 }, { timeout: 30000 });
    });

    it('should throw error for select without values', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#select',
        action: 'select',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Values are required for select action'
      );
    });

    it('should execute check action', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#checkbox',
        action: 'check',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.check).toHaveBeenCalledWith({ timeout: 30000 });
    });

    it('should execute check action with force', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#checkbox',
        action: 'check',
        force: true,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.setChecked).toHaveBeenCalledWith(true, { timeout: 30000, force: true });
    });

    it('should execute uncheck action', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#checkbox',
        action: 'uncheck',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.uncheck).toHaveBeenCalledWith({ timeout: 30000 });
    });

    it('should execute uncheck action with force', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#checkbox',
        action: 'uncheck',
        force: true,
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.setChecked).toHaveBeenCalledWith(false, { timeout: 30000, force: true });
    });

    it('should execute upload action with single file', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#file-input',
        action: 'upload',
        filePaths: '/path/to/file.pdf',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.setInputFiles).toHaveBeenCalledWith(['/path/to/file.pdf'], { timeout: 30000 });
    });

    it('should execute upload action with multiple files', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#file-input',
        action: 'upload',
        filePaths: ['/path/to/file1.pdf', '/path/to/file2.pdf'],
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.setInputFiles).toHaveBeenCalledWith(
        ['/path/to/file1.pdf', '/path/to/file2.pdf'],
        { timeout: 30000 }
      );
    });

    it('should throw error for upload without filePaths', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#file-input',
        action: 'upload',
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'File paths are required for upload action'
      );
    });

    it('should throw error for unknown action', async () => {
      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#input',
        action: 'unknown' as any,
      });

      await expect(handler.execute(node, mockContext)).rejects.toThrow(
        'Unknown action type'
      );
    });

    it('should interpolate file paths', async () => {
      (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => {
        if (str === '${filePath}') return '/interpolated/path.pdf';
        return str;
      });

      const node = createMockNode(NodeType.FORM_INPUT, {
        selector: '#file-input',
        action: 'upload',
        filePaths: '${filePath}',
      });

      await handler.execute(node, mockContext);

      expect(mockLocator.setInputFiles).toHaveBeenCalledWith(['/interpolated/path.pdf'], { timeout: 30000 });
    });
  });
});
