import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSelectorFinder } from '../useSelectorFinder';
import { useWorkflowStore } from '../../store/workflowStore';
import * as selectorFinderService from '../../services/selectorFinder';

vi.mock('../../store/workflowStore');
vi.mock('../../services/selectorFinder');

describe('useSelectorFinder', () => {
  const mockUpdateNodeData = vi.fn();
  const mockOnSelectorsGenerated = vi.fn(() => vi.fn());

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('3001'),
    });
    (useWorkflowStore as any).mockReturnValue({
      updateNodeData: mockUpdateNodeData,
    });
    (selectorFinderService.onSelectorsGenerated as any) = mockOnSelectorsGenerated;
  });

  it('should initialize selector finder hook', () => {
    const { result } = renderHook(() => useSelectorFinder('n1', 'selector'));

    expect(result.current).toHaveProperty('selectors');
    expect(result.current).toHaveProperty('showModal');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('startFinder');
    expect(result.current).toHaveProperty('handleAccept');
    expect(result.current).toHaveProperty('handleCancel');
  });
});
