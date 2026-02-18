import * as fs from 'fs';
import * as path from 'path';
import { takeNodeAccessibilitySnapshot } from '../accessibilitySnapshots';
import { ContextManager } from '../../context';
import { ExecutionTracker } from '../../../utils/executionTracker';

jest.mock('fs');

describe('accessibilitySnapshots', () => {
  let mockContext: ContextManager;
  let mockTracker: ExecutionTracker;
  let mockCdp: any;
  let mockPage: any;

  beforeEach(() => {
    mockCdp = {
      send: jest.fn()
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce({ nodes: [{ nodeId: '1', role: { value: 'WebArea' }, name: { value: 'Test' }, childIds: [] }] }), // getFullAXTree
      detach: jest.fn().mockResolvedValue(undefined),
    };

    mockPage = {
      context: jest.fn().mockReturnValue({
        newCDPSession: jest.fn().mockResolvedValue(mockCdp),
      }),
      isClosed: jest.fn().mockReturnValue(false),
    };

    mockContext = {
      getPage: jest.fn().mockReturnValue(mockPage),
    } as any;

    mockTracker = {
      getSnapshotsDirectory: jest.fn().mockReturnValue('/tmp/snapshots'),
      recordAccessibilitySnapshot: jest.fn(),
    } as any;

    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockClear();
  });

  describe('takeNodeAccessibilitySnapshot', () => {
    it('should capture snapshot and record in tracker', async () => {
      await takeNodeAccessibilitySnapshot('node-1', 'pre', mockContext, mockTracker);

      expect(mockCdp.send).toHaveBeenCalledWith('Accessibility.enable');
      expect(mockCdp.send).toHaveBeenCalledWith('Accessibility.getFullAXTree');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockTracker.recordAccessibilitySnapshot).toHaveBeenCalledWith(
        'node-1',
        expect.stringContaining('node-1-pre-'),
        'pre'
      );
    });

    it('should skip if no page available', async () => {
      (mockContext.getPage as jest.Mock).mockReturnValue(null);

      await takeNodeAccessibilitySnapshot('node-1', 'pre', mockContext, mockTracker);

      expect(mockCdp.send).not.toHaveBeenCalled();
      expect(mockTracker.recordAccessibilitySnapshot).not.toHaveBeenCalled();
    });

    it('should skip when tracker has no snapshots directory', async () => {
      const trackerWithoutSnapshotsDir = {
        getSnapshotsDirectory: jest.fn().mockReturnValue(undefined),
        recordAccessibilitySnapshot: jest.fn(),
      } as any;
      (fs.writeFileSync as jest.Mock).mockClear();
      await takeNodeAccessibilitySnapshot('node-1', 'pre', mockContext, trackerWithoutSnapshotsDir);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mockPage.context as jest.Mock).mockReturnValue({
        newCDPSession: jest.fn().mockRejectedValue(new Error('CDP failed')),
      });

      await expect(
        takeNodeAccessibilitySnapshot('node-1', 'pre', mockContext, mockTracker)
      ).resolves.not.toThrow();
    });
  });
});
