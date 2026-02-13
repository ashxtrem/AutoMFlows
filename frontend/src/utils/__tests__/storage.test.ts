import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStorageUsage, formatBytes, clearWorkflowCache, getAllStorageKeys } from '../storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  describe('getStorageUsage', () => {
    it('should calculate storage usage', () => {
      localStorageMock.setItem('key1', 'value1');
      localStorageMock.setItem('key2', 'value2');

      const usage = getStorageUsage();
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.total).toBe(5 * 1024 * 1024);
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', () => {
      Storage.prototype.key = vi.fn(() => {
        throw new Error('Storage error');
      });
      const usage = getStorageUsage();
      expect(usage.used).toBe(0);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toContain('KB');
      expect(formatBytes(1024 * 1024)).toContain('MB');
    });
  });

  describe('clearWorkflowCache', () => {
    it('should clear workflow-related keys', () => {
      localStorageMock.setItem('reactflow-test', 'value1');
      localStorageMock.setItem('automflows_workflow_test', 'value2');
      localStorageMock.setItem('other-key', 'value3');

      clearWorkflowCache();
      
      expect(localStorageMock.getItem('reactflow-test')).toBeNull();
      expect(localStorageMock.getItem('automflows_workflow_test')).toBeNull();
      expect(localStorageMock.getItem('other-key')).toBe('value3'); // Should not be removed
    });
  });

  describe('getAllStorageKeys', () => {
    it('should return all storage keys', () => {
      localStorageMock.setItem('key1', 'value1');
      localStorageMock.setItem('key2', 'value2');

      const keys = getAllStorageKeys();
      expect(keys.length).toBe(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });
});
