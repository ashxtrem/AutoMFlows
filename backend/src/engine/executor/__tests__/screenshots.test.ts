import { takeNodeScreenshot } from '../screenshots';
import { createMockPage } from '../../../__tests__/helpers/mocks';
import { ContextManager } from '../../context';
import { PlaywrightManager } from '../../../utils/playwright';
import { ExecutionTracker } from '../../../utils/executionTracker';

jest.mock('../../../utils/playwright');
jest.mock('../../../utils/executionTracker');

describe('screenshots', () => {
  let mockContext: ContextManager;
  let mockPlaywright: PlaywrightManager;
  let mockTracker: ExecutionTracker;

  beforeEach(() => {
    mockContext = {
      getPage: jest.fn().mockReturnValue(createMockPage()),
    } as any;

    mockPlaywright = {
      takeScreenshot: jest.fn().mockResolvedValue('/path/to/screenshot.png'),
    } as any;

    mockTracker = {
      recordScreenshot: jest.fn(),
    } as any;
  });

  describe('takeNodeScreenshot', () => {
    it('should take screenshot and record in tracker', async () => {
      await takeNodeScreenshot('node-1', 'pre', mockContext, mockPlaywright, mockTracker);

      expect(mockPlaywright.takeScreenshot).toHaveBeenCalled();
      expect(mockTracker.recordScreenshot).toHaveBeenCalledWith(
        'node-1',
        '/path/to/screenshot.png',
        'pre'
      );
    });

    it('should skip if no page available', async () => {
      (mockContext.getPage as jest.Mock).mockReturnValue(null);

      await takeNodeScreenshot('node-1', 'pre', mockContext, mockPlaywright, mockTracker);

      expect(mockPlaywright.takeScreenshot).not.toHaveBeenCalled();
      expect(mockTracker.recordScreenshot).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mockPlaywright.takeScreenshot as jest.Mock).mockRejectedValue(new Error('Screenshot failed'));

      await expect(
        takeNodeScreenshot('node-1', 'pre', mockContext, mockPlaywright, mockTracker)
      ).resolves.not.toThrow();
    });

    it('should work without tracker', async () => {
      await takeNodeScreenshot('node-1', 'post', mockContext, mockPlaywright, undefined);

      expect(mockPlaywright.takeScreenshot).toHaveBeenCalled();
    });
  });
});
