import { describe, it, expect } from 'vitest';
import { searchNodes } from '../nodeSearch';

describe('nodeSearch', () => {
  const mockNodes = [
    { id: 'n1', data: { type: 'action', label: 'Click Button' } },
    { id: 'n2', data: { type: 'start', label: 'Start Flow' } },
    { id: 'n3', data: { type: 'navigation', url: 'https://example.com' } },
  ] as any;

  it('should find nodes by label', () => {
    const results = searchNodes('Click', mockNodes);
    expect(results).toContain('n1');
  });

  it('should find nodes by type', () => {
    const results = searchNodes('action', mockNodes);
    expect(results).toContain('n1');
  });

  it('should find nodes by property value', () => {
    const results = searchNodes('example.com', mockNodes);
    expect(results).toContain('n3');
  });

  it('should return empty array for no matches', () => {
    const results = searchNodes('nonexistent', mockNodes);
    expect(results).toEqual([]);
  });

  it('should be case insensitive', () => {
    const results = searchNodes('CLICK', mockNodes);
    expect(results).toContain('n1');
  });
});
