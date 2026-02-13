import { describe, it, expect, vi } from 'vitest';
import { getModifierKey, formatKeyCombination, KEY_BINDINGS } from '../keyBindings';

describe('keyBindings', () => {
  describe('getModifierKey', () => {
    it('should return Cmd for Mac platform', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        writable: true,
      });
      expect(getModifierKey()).toBe('Cmd');
    });

    it('should return Ctrl for non-Mac platform', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        writable: true,
      });
      expect(getModifierKey()).toBe('Ctrl');
    });
  });

  describe('formatKeyCombination', () => {
    it('should format key combination', () => {
      const binding = {
        id: 'test',
        keys: ['Ctrl', 'Z'],
        description: 'Test',
        category: 'workflow' as const,
      };
      const formatted = formatKeyCombination(binding);
      expect(formatted).toContain('Ctrl');
    });

    it('should use platform-specific keys when available', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        writable: true,
      });
      const binding = {
        id: 'test',
        keys: ['Ctrl', 'Z'],
        description: 'Test',
        category: 'workflow' as const,
        platformSpecific: {
          mac: ['Cmd', 'Z'],
        },
      };
      const formatted = formatKeyCombination(binding);
      expect(formatted).toContain('Cmd');
    });
  });

  describe('KEY_BINDINGS', () => {
    it('should contain common shortcuts', () => {
      expect(KEY_BINDINGS.some(b => b.id === 'undo')).toBe(true);
      expect(KEY_BINDINGS.some(b => b.id === 'redo')).toBe(true);
    });
  });
});
