import { describe, it, expect } from 'vitest';
import { getContrastTextColor } from '../colorContrast';

describe('colorContrast', () => {
  describe('getContrastTextColor', () => {
    it('should return white for dark backgrounds', () => {
      expect(getContrastTextColor('#000000')).toBe('#ffffff');
      expect(getContrastTextColor('#333333')).toBe('#ffffff');
    });

    it('should return black for light backgrounds', () => {
      expect(getContrastTextColor('#ffffff')).toBe('#000000');
      expect(getContrastTextColor('#cccccc')).toBe('#000000');
    });

    it('should handle hex colors with #', () => {
      expect(getContrastTextColor('#000000')).toBe('#ffffff');
      expect(getContrastTextColor('#ffffff')).toBe('#000000');
    });
  });
});
