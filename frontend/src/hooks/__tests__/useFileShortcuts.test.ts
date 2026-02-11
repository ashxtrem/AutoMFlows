import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFileShortcuts } from '../useFileShortcuts';

describe('useFileShortcuts', () => {
  let eventListener: ((e: Event) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    // Track event listeners
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'keydown') {
        eventListener = handler as (e: Event) => void;
      }
      return originalAddEventListener.call(window, event, handler);
    });
  });

  afterEach(() => {
    eventListener = null;
  });

  it('should dispatch workflow-save event on Ctrl+S', async () => {
    const mockDispatch = vi.spyOn(window, 'dispatchEvent');
    renderHook(() => useFileShortcuts());

    await waitFor(() => {
      expect(eventListener).toBeTruthy();
    });

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', {
      value: document.body,
      writable: false,
    });

    if (eventListener) {
      eventListener(event);
    }

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
      const customEvent = mockDispatch.mock.calls.find(
        call => call[0] instanceof CustomEvent && call[0].type === 'workflow-save'
      );
      expect(customEvent).toBeTruthy();
    });
  });

  it('should not trigger when typing in input', async () => {
    const mockDispatch = vi.spyOn(window, 'dispatchEvent');
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useFileShortcuts());

    await waitFor(() => {
      expect(eventListener).toBeTruthy();
    });

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', {
      value: input,
      writable: false,
    });

    if (eventListener) {
      eventListener(event);
    }

    await waitFor(() => {
      const customEvent = mockDispatch.mock.calls.find(
        call => call[0] instanceof CustomEvent && call[0].type === 'workflow-save'
      );
      expect(customEvent).toBeFalsy();
    });

    document.body.removeChild(input);
  });
});
