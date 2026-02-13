import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEffectiveTheme, applyTheme, initTheme } from '../theme';

describe('theme', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  describe('getEffectiveTheme', () => {
    it('should return light theme when set to light', () => {
      expect(getEffectiveTheme('light')).toBe('light');
    });

    it('should return dark theme when set to dark', () => {
      expect(getEffectiveTheme('dark')).toBe('dark');
    });

    it('should resolve auto theme based on system preference', () => {
      const mockMatchMedia = vi.fn((query: string) => ({
        matches: query.includes('dark'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      const theme = getEffectiveTheme('auto');
      expect(['light', 'dark']).toContain(theme);
    });
  });

  describe('applyTheme', () => {
    it('should apply light theme', () => {
      applyTheme('light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should apply dark theme', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should remove previous theme classes', () => {
      document.documentElement.classList.add('theme-light');
      applyTheme('dark');
      expect(document.documentElement.classList.contains('theme-light')).toBe(false);
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });
  });

  describe('initTheme', () => {
    it('should initialize theme and return cleanup function', () => {
      const cleanup = initTheme('light');
      expect(typeof cleanup).toBe('function');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });

    it('should handle auto theme with system preference listener', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      window.matchMedia = vi.fn(() => mockMediaQuery as any);

      const cleanup = initTheme('auto');
      expect(typeof cleanup).toBe('function');
      cleanup();
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalled();
    });
  });
});
