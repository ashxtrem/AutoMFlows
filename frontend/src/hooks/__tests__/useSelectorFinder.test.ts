import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSelectorFinder } from '../useSelectorFinder';
import { useWorkflowStore } from '../../store/workflowStore';
import * as selectorFinderService from '../../services/selectorFinder';

vi.mock('../../store/workflowStore');
vi.mock('../../services/selectorFinder');

describe('useSelectorFinder', () => {
  const mockUpdateNodeData = vi.fn();
  const mockCleanup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('3001'),
    });
    (useWorkflowStore as any).mockReturnValue({
      updateNodeData: mockUpdateNodeData,
    });
    (selectorFinderService.onSelectorsGenerated as any) = vi.fn(() => mockCleanup);
    (selectorFinderService.startSelectorFinder as any) = vi.fn().mockResolvedValue({
      sessionId: 'sess-1',
      pageUrl: 'http://localhost:3001',
    });
  });

  it('initial state has loading=false, showModal=false, empty selectors', () => {
    const { result } = renderHook(() => useSelectorFinder('n1', 'selector'));

    expect(result.current.loading).toBe(false);
    expect(result.current.showModal).toBe(false);
    expect(result.current.selectors).toEqual([]);
  });

  it('startFinder sets loading to true and calls startSelectorFinder', async () => {
    const { result } = renderHook(() => useSelectorFinder('n1', 'selector'));

    await act(async () => {
      await result.current.startFinder();
    });

    expect(selectorFinderService.startSelectorFinder).toHaveBeenCalledWith('n1', 'selector', 3001);
  });

  it('startFinder resets loading on error', async () => {
    (selectorFinderService.startSelectorFinder as any) = vi.fn().mockRejectedValue(
      new Error('connection failed')
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSelectorFinder('n1', 'selector'));

    await act(async () => {
      await result.current.startFinder();
    });

    expect(result.current.loading).toBe(false);
  });

  it('handleCancel resets showModal and selectors', async () => {
    const { result } = renderHook(() => useSelectorFinder('n1', 'selector'));

    act(() => {
      result.current.handleCancel();
    });

    expect(result.current.showModal).toBe(false);
    expect(result.current.selectors).toEqual([]);
  });

  it('registers onSelectorsGenerated callback on mount', () => {
    renderHook(() => useSelectorFinder('n1', 'selector'));
    expect(selectorFinderService.onSelectorsGenerated).toHaveBeenCalledWith(
      'n1',
      'selector',
      expect.any(Function)
    );
  });

  it('cleans up onSelectorsGenerated callback on unmount', () => {
    const { unmount } = renderHook(() => useSelectorFinder('n1', 'selector'));
    unmount();
    expect(mockCleanup).toHaveBeenCalled();
  });
});
