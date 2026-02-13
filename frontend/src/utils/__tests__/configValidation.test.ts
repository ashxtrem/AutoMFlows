import { describe, it, expect } from 'vitest';
import { findDuplicateKeys } from '../configValidation';

describe('configValidation', () => {
  describe('findDuplicateKeys', () => {
    it('should find duplicate keys at root level', () => {
      const json = '{"key1": "value1", "key2": "value2", "key1": "value3"}';
      const duplicates = findDuplicateKeys(json);
      expect(duplicates).toContain('key1');
    });

    it('should return empty array for valid JSON', () => {
      const json = '{"key1": "value1", "key2": "value2"}';
      const duplicates = findDuplicateKeys(json);
      expect(duplicates.length).toBe(0);
    });

    it('should return empty array for non-object JSON', () => {
      const json = '["array", "values"]';
      const duplicates = findDuplicateKeys(json);
      expect(duplicates.length).toBe(0);
    });
  });

});
