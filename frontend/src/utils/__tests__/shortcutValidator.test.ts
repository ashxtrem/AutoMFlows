import { describe, it, expect } from 'vitest';
import { validateShortcut, isShortcutKeyPress, getReservedShortcuts } from '../shortcutValidator';

describe('shortcutValidator', () => {
  describe('validateShortcut', () => {
    it('should validate single character shortcut', () => {
      const result = validateShortcut('a');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty string', () => {
      const result = validateShortcut('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exactly one character');
    });

    it('should reject multi-character string', () => {
      const result = validateShortcut('ab');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exactly one character');
    });

    it('should validate alphanumeric characters', () => {
      expect(validateShortcut('a').isValid).toBe(true);
      expect(validateShortcut('Z').isValid).toBe(true);
      expect(validateShortcut('5').isValid).toBe(true);
    });

    it('should reject special characters', () => {
      expect(validateShortcut('!').isValid).toBe(false);
      expect(validateShortcut('@').isValid).toBe(false);
      expect(validateShortcut('#').isValid).toBe(false);
    });

    it('should detect conflicts with existing shortcuts', () => {
      const result = validateShortcut('a', ['a', 'b']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('already in use');
    });

    it('should allow shortcut not in existing list', () => {
      const result = validateShortcut('c', ['a', 'b']);
      expect(result.isValid).toBe(true);
    });
  });

  describe('isShortcutKeyPress', () => {
    it('should return true for single alphanumeric key', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(isShortcutKeyPress(event)).toBe(true);
    });

    it('should return false when modifier keys pressed', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
      expect(isShortcutKeyPress(event)).toBe(false);
    });

    it('should return false for special keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      expect(isShortcutKeyPress(event)).toBe(false);
    });
  });

  describe('getReservedShortcuts', () => {
    it('should return array of reserved shortcuts', () => {
      const reserved = getReservedShortcuts();
      expect(Array.isArray(reserved)).toBe(true);
      expect(reserved.length).toBeGreaterThan(0);
    });

    it('should include function keys', () => {
      const reserved = getReservedShortcuts();
      expect(reserved).toContain('f1');
      expect(reserved).toContain('f12');
    });
  });
});
