import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeSearch } from '../nodeSearch';
import { searchNodes } from '../../../utils/nodeSearch';

vi.mock('../../../utils/nodeSearch', () => ({
  searchNodes: vi.fn(() => ['node-1', 'node-2']),
}));

describe('useNodeSearch', () => {
  const mockFitView = vi.fn();
  const mockNodes = [
    { id: 'node-1', data: { type: 'action' } },
    { id: 'node-2', data: { type: 'start' } },
  ] as any;

  const defaultProps = {
    fitView: mockFitView,
    nodes: mockNodes,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with closed search', () => {
    const { result } = renderHook(() => useNodeSearch(defaultProps));
    expect(result.current.nodeSearchOverlayOpen).toBe(false);
    expect(result.current.nodeSearchQuery).toBe('');
  });

  it('should open search overlay', () => {
    const { result } = renderHook(() => useNodeSearch(defaultProps));
    act(() => {
      result.current.setNodeSearchOverlayOpen(true);
    });
    expect(result.current.nodeSearchOverlayOpen).toBe(true);
  });

  it('should search nodes when query is long enough', () => {
    const { result } = renderHook(() => useNodeSearch(defaultProps));
    act(() => {
      result.current.setNodeSearchQuery('test');
    });
    // Wait for debounce
    act(() => {
      result.current.handleNodeSearch();
    });
    expect(searchNodes).toHaveBeenCalled();
  });

  it('should close search', () => {
    const { result } = renderHook(() => useNodeSearch(defaultProps));
    act(() => {
      result.current.setNodeSearchOverlayOpen(true);
      result.current.setNodeSearchQuery('test');
    });
    act(() => {
      result.current.handleNodeSearchClose();
    });
    expect(result.current.nodeSearchOverlayOpen).toBe(false);
    expect(result.current.nodeSearchQuery).toBe('');
  });
});
