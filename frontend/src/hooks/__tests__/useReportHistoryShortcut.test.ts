import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReportHistoryShortcut } from '../useReportHistoryShortcut';

describe('useReportHistoryShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.open = vi.fn();
  });

  it('should open report history on Ctrl+H', () => {
    renderHook(() => useReportHistoryShortcut());

    const event = new KeyboardEvent('keydown', {
      key: 'h',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('/reports/history'),
      '_blank'
    );
  });
});
