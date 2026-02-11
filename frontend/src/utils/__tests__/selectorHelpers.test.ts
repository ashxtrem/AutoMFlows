import { describe, it, expect } from 'vitest';
import { getSelectorPlaceholder, getSelectorHelpText, SELECTOR_TYPE_OPTIONS } from '../selectorHelpers';

describe('selectorHelpers', () => {
  describe('getSelectorPlaceholder', () => {
    it('should return placeholder for css selector', () => {
      expect(getSelectorPlaceholder('css')).toContain('#button');
    });

    it('should return placeholder for xpath selector', () => {
      expect(getSelectorPlaceholder('xpath')).toContain('//button');
    });

    it('should return placeholder for getByRole', () => {
      expect(getSelectorPlaceholder('getByRole')).toContain('role:');
    });

    it('should return default placeholder for unknown type', () => {
      const placeholder = getSelectorPlaceholder('unknown');
      expect(placeholder).toBeTruthy();
    });
  });

  describe('getSelectorHelpText', () => {
    it('should return help text for getByRole', () => {
      const helpText = getSelectorHelpText('getByRole');
      expect(helpText).toContain('Format');
    });

    it('should return empty string for types without help text', () => {
      expect(getSelectorHelpText('css')).toBe('');
    });
  });

  describe('SELECTOR_TYPE_OPTIONS', () => {
    it('should contain common selector types', () => {
      expect(SELECTOR_TYPE_OPTIONS.some(opt => opt.value === 'css')).toBe(true);
      expect(SELECTOR_TYPE_OPTIONS.some(opt => opt.value === 'xpath')).toBe(true);
    });
  });
});
