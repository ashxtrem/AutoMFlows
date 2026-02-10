import { injectFinderLibrary, injectFinderLibraryDirect, getFinderLibraryScript, getFinderLibraryDirectScript } from '../finderLibrary';
import { createMockPage } from '../../../__tests__/helpers/mocks';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('finderLibrary', () => {
  let mockPage: any;

  beforeEach(() => {
    mockPage = createMockPage();
    mockPage.addInitScript = jest.fn().mockResolvedValue(undefined);
    mockPage.evaluate = jest.fn().mockResolvedValue(undefined);
    mockPage.addScriptTag = jest.fn().mockResolvedValue(undefined);

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
  });

  describe('getFinderLibraryScript', () => {
    it('should return a script string', () => {
      const script = getFinderLibraryScript();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    it('should contain finder injection logic', () => {
      const script = getFinderLibraryScript();
      expect(script).toContain('__finderInjected');
      expect(script).toContain('@medv/finder');
    });
  });

  describe('injectFinderLibrary', () => {
    it('should add init script to page', async () => {
      await injectFinderLibrary(mockPage);

      expect(mockPage.addInitScript).toHaveBeenCalledWith(expect.any(String));
    });

    it('should include finder library script', async () => {
      await injectFinderLibrary(mockPage);

      const script = mockPage.addInitScript.mock.calls[0][0];
      expect(script).toContain('@medv/finder');
      expect(script).toContain('window.__finder');
    });
  });

  describe('getFinderLibraryDirectScript', () => {
    it('should return a script string', () => {
      const script = getFinderLibraryDirectScript();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    it('should contain CDN fallback logic', () => {
      const script = getFinderLibraryDirectScript();
      expect(script).toContain('unpkg.com');
      expect(script).toContain('@medv/finder');
    });
  });

  describe('injectFinderLibraryDirect', () => {
    it('should try to read from node_modules first', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('finder-code');

      await injectFinderLibraryDirect(mockPage);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should check multiple node_modules paths', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // root/node_modules
        .mockReturnValueOnce(false) // backend/node_modules
        .mockReturnValueOnce(false); // ../node_modules

      await injectFinderLibraryDirect(mockPage);

      // It checks 3 paths, but also checks again in the fallback path
      expect(fs.existsSync).toHaveBeenCalled();
      expect((fs.existsSync as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should fallback to CDN if local file not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await injectFinderLibraryDirect(mockPage);

      expect(mockPage.evaluate).toHaveBeenCalled();
      const evaluateCall = mockPage.evaluate.mock.calls[0][0];
      expect(typeof evaluateCall).toBe('function');
    });

    it('should inject code via evaluate if file found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('finder-code');

      await injectFinderLibraryDirect(mockPage);

      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.any(Function),
        'finder-code'
      );
    });

    it('should handle read errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      await expect(injectFinderLibraryDirect(mockPage)).resolves.not.toThrow();
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should handle general errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('FS error');
      });

      await expect(injectFinderLibraryDirect(mockPage)).resolves.not.toThrow();
    });
  });
});
