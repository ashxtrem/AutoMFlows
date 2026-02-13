import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useServerRestartWarning } from '../useServerRestartWarning';
import * as getBackendPort from '../../utils/getBackendPort';
import { io } from 'socket.io-client';

vi.mock('../../utils/getBackendPort');
vi.mock('socket.io-client');

describe('useServerRestartWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (getBackendPort.getBackendPort as any).mockResolvedValue(3001);
    (io as any).mockReturnValue({
      on: vi.fn(),
      connected: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize hook and return warning state', () => {
    const { result } = renderHook(() => useServerRestartWarning());

    expect(result.current).toHaveProperty('showWarning');
    expect(result.current).toHaveProperty('handleProceed');
    expect(result.current).toHaveProperty('handleCancel');
    expect(result.current.showWarning).toBe(false);
  });

  it('should handle proceed action', () => {
    sessionStorage.setItem('prevent-auto-refresh', 'true');
    const { result } = renderHook(() => useServerRestartWarning());

    // Mock window.location.reload by replacing the entire location object
    const mockReload = vi.fn();
    delete (window as any).location;
    (window as any).location = { reload: mockReload };

    result.current.handleProceed();

    expect(sessionStorage.getItem('prevent-auto-refresh')).toBeNull();
    expect(mockReload).toHaveBeenCalled();

    // Restore original location
    (window as any).location = location;
  });

  it('should handle cancel action', () => {
    const { result } = renderHook(() => useServerRestartWarning());

    result.current.handleCancel();

    expect(result.current.showWarning).toBe(false);
    // handleCancel sets showWarning to false but doesn't set sessionStorage
    // The sessionStorage is set elsewhere in the hook when disconnect happens
  });
});
