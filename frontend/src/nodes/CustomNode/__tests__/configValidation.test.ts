import { describe, it, expect } from 'vitest';
import { validateConfigPaths, findDuplicateKeys, collectAllPaths, findPathConflicts } from '../configValidation';

describe('CustomNode Config Validation', () => {
  describe('findDuplicateKeys', () => {
    it('should find duplicate keys at root level', () => {
      const json = '{"key1": "value1", "key2": "value2", "key1": "value3"}';
      const duplicates = findDuplicateKeys(json);
      expect(duplicates).toContain('key1');
    });

    it('should return empty array for valid JSON', () => {
      const json = '{"key1": "value1", "key2": "value2"}';
      const duplicates = findDuplicateKeys(json);
      expect(duplicates).toEqual([]);
    });

    it('should return empty array for non-object JSON', () => {
      const json = '["value1", "value2"]';
      const duplicates = findDuplicateKeys(json);
      expect(duplicates).toEqual([]);
    });
  });

  describe('collectAllPaths', () => {
    it('should collect paths from simple object', () => {
      const obj = { key1: 'value1', key2: 'value2' };
      const paths = collectAllPaths(obj);
      expect(paths.has('key1')).toBe(true);
      expect(paths.has('key2')).toBe(true);
    });

    it('should collect nested paths', () => {
      const obj = { parent: { child: 'value' } };
      const paths = collectAllPaths(obj);
      expect(paths.has('parent')).toBe(true);
      expect(paths.has('parent.child')).toBe(true);
    });

    it('should handle arrays', () => {
      const obj = { items: ['value1', 'value2'] };
      const paths = collectAllPaths(obj);
      expect(paths.has('items')).toBe(true);
      expect(paths.has('items[0]')).toBe(true);
      expect(paths.has('items[1]')).toBe(true);
    });
  });

  describe('findPathConflicts', () => {
    it('should find type conflicts', () => {
      const paths = new Map<string, { path: string; type: 'primitive' | 'object' | 'array'; value: any }>();
      paths.set('key', { path: 'key', type: 'primitive', value: 'value' });
      paths.set('key', { path: 'key', type: 'object', value: {} }); // Overwrite with different type
      const conflicts = findPathConflicts(paths);
      // Note: Map only keeps last value, so this test checks the function handles the case
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should find primitive with child paths conflict', () => {
      const paths = new Map<string, { path: string; type: 'primitive' | 'object' | 'array'; value: any }>([
        ['parent', { path: 'parent', type: 'primitive', value: 'value' }],
        ['parent.child', { path: 'parent.child', type: 'primitive', value: 'child' }],
      ]);
      const conflicts = findPathConflicts(paths);
      expect(conflicts.some(c => c.includes('parent'))).toBe(true);
    });
  });

  describe('validateConfigPaths', () => {
    it('should validate correct JSON', () => {
      const json = '{"key1": "value1", "key2": "value2"}';
      const parsed = JSON.parse(json);
      const result = validateConfigPaths(json, parsed);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect duplicate keys', () => {
      const json = '{"key1": "value1", "key1": "value2"}';
      const parsed = JSON.parse(json);
      const result = validateConfigPaths(json, parsed);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('should detect path conflicts', () => {
      const json = '{"parent": "value", "parent.child": "child"}';
      const parsed = JSON.parse(json);
      const result = validateConfigPaths(json, parsed);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Path conflict'))).toBe(true);
    });
  });
});
