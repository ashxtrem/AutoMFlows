import { injectFinderOverlay, injectFinderOverlayDirect, getOverlayScript, getOverlayDirectScript } from '../overlay';
import { createMockPage } from '../../../__tests__/helpers/mocks';

describe('overlay', () => {
  let mockPage: any;

  beforeEach(() => {
    mockPage = createMockPage();
    mockPage.addInitScript = jest.fn().mockResolvedValue(undefined);
    mockPage.addScriptTag = jest.fn().mockResolvedValue(undefined);
  });

  describe('getOverlayScript', () => {
    it('should return a script string', () => {
      const script = getOverlayScript();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    it('should contain overlay creation logic', () => {
      const script = getOverlayScript();
      expect(script).toContain('automflows-finder-overlay');
      expect(script).toContain('createOverlay');
    });

    it('should contain finder mode toggle logic', () => {
      const script = getOverlayScript();
      expect(script).toContain('toggleFinderMode');
      expect(script).toContain('finderActive');
    });

    it('should contain element click handling', () => {
      const script = getOverlayScript();
      expect(script).toContain('handleElementClick');
      expect(script).toContain('generateSelectors');
    });
  });

  describe('injectFinderOverlay', () => {
    it('should add init script to page', async () => {
      await injectFinderOverlay(mockPage);

      expect(mockPage.addInitScript).toHaveBeenCalledWith(expect.any(String));
    });

    it('should include overlay script', async () => {
      await injectFinderOverlay(mockPage);

      const script = mockPage.addInitScript.mock.calls[0][0];
      expect(script).toContain('automflows-finder-overlay');
    });
  });

  describe('getOverlayDirectScript', () => {
    it('should return a script string', () => {
      const script = getOverlayDirectScript();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    it('should contain overlay creation logic', () => {
      const script = getOverlayDirectScript();
      expect(script).toContain('automflows-finder-overlay');
      expect(script).toContain('initOverlayDirect');
    });
  });

  describe('injectFinderOverlayDirect', () => {
    it('should add script tag to page', async () => {
      await injectFinderOverlayDirect(mockPage);

      expect(mockPage.addScriptTag).toHaveBeenCalledWith({
        content: expect.any(String),
      });
    });

    it('should include overlay direct script', async () => {
      await injectFinderOverlayDirect(mockPage);

      const scriptTag = mockPage.addScriptTag.mock.calls[0][0];
      expect(scriptTag.content).toContain('automflows-finder-overlay');
    });

    it('should handle errors gracefully', async () => {
      mockPage.addScriptTag.mockRejectedValueOnce(new Error('Script tag error'));

      await expect(injectFinderOverlayDirect(mockPage)).resolves.not.toThrow();
    });
  });
});
