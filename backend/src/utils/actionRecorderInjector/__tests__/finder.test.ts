import { injectFinderLibrary } from '../finder';
import { createMockPage } from '../../../__tests__/helpers/mocks';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('injectFinderLibrary', () => {
  let mockPage: any;

  beforeEach(() => {
    mockPage = createMockPage();
    mockPage.evaluate = jest.fn().mockResolvedValue(undefined);
    
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
  });

  it('should try to load finder from node_modules', async () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('finder-code');

    await injectFinderLibrary(mockPage);

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(mockPage.evaluate).toHaveBeenCalled();
  });

  it('should fallback to CDN if local file not found', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await injectFinderLibrary(mockPage);

    expect(mockPage.evaluate).toHaveBeenCalled();
    const evaluateCall = mockPage.evaluate.mock.calls[0][0];
    expect(typeof evaluateCall).toBe('function');
  });

  it('should not inject if finder already exists', async () => {
    mockPage.evaluate.mockImplementation((fn: any) => {
      // Simulate finder already exists
      const mockWindow = { __finder: () => '', finder: () => '' };
      fn.call(mockWindow);
      return Promise.resolve();
    });

    await injectFinderLibrary(mockPage);

    // Should still call evaluate but finder check should prevent injection
    expect(mockPage.evaluate).toHaveBeenCalled();
  });
});
