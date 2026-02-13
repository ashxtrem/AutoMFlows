import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBreakpointShortcut } from '../useBreakpointShortcut';
import { useWorkflowStore } from '../../store/workflowStore';
import { useNotificationStore } from '../../store/notificationStore';

vi.mock('../../store/workflowStore');
vi.mock('../../store/notificationStore');

describe('useBreakpointShortcut', () => {
  const mockSetBreakpointSettings = vi.fn();
  const mockAddNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      breakpointEnabled: false,
      setBreakpointSettings: mockSetBreakpointSettings,
    });
    (useNotificationStore as any).mockReturnValue(mockAddNotification);
  });

  it('should toggle breakpoint on Ctrl+B', () => {
    renderHook(() => useBreakpointShortcut());

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockSetBreakpointSettings).toHaveBeenCalledWith({ enabled: true });
    expect(mockAddNotification).toHaveBeenCalled();
  });

  it('should toggle breakpoint on Cmd+B', () => {
    renderHook(() => useBreakpointShortcut());

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockSetBreakpointSettings).toHaveBeenCalled();
  });
});
