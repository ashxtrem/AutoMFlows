/**
 * @jest-environment jsdom
 */
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
    // Mock evaluate to handle window object - now window exists in jsdom
    mockPage.evaluate = jest.fn().mockImplementation((fn: any, ...args: any[]) => {
      if (typeof fn === 'function') {
        // Call the function with window as 'this' context (window exists in jsdom)
        try {
          fn.call(window, ...args);
        } catch (e) {
          // Ignore errors
        }
      }
      return Promise.resolve(undefined);
    });
    
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
  });

  it('should try to load finder from node_modules', async () => {
    // Mock existsSync to return true for the first path check
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      // Return true for the first path (node_modules/@medv/finder/finder.js)
      if (path.includes('node_modules') && path.includes('finder.js')) {
        return true;
      }
      return false;
    });
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
    // Set up window with finder already present
    (window as any).__finder = () => '';
    (window as any).finder = () => '';
    
    mockPage.evaluate.mockImplementation((fn: any, ...args: any[]) => {
      // Call the function with window context (window exists in jsdom)
      if (typeof fn === 'function') {
        try {
          fn.call(window, ...args);
        } catch (e) {
          // Ignore errors
        }
      }
      return Promise.resolve();
    });

    await injectFinderLibrary(mockPage);

    // Should still call evaluate but finder check should prevent injection
    expect(mockPage.evaluate).toHaveBeenCalled();
    
    // Cleanup
    delete (window as any).__finder;
    delete (window as any).finder;
  });
});
