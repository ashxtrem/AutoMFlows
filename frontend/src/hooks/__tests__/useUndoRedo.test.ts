import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';
import { useWorkflowStore } from '../../store/workflowStore';

vi.mock('../../store/workflowStore');

describe('useUndoRedo', () => {
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();
  const mockCanUndo = vi.fn(() => true);
  const mockCanRedo = vi.fn(() => true);
  let eventListener: ((e: Event) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockImplementation((selector) => {
      const state = {
        undo: mockUndo,
        redo: mockRedo,
        canUndo: mockCanUndo,
        canRedo: mockCanRedo,
      };
      return selector ? selector(state) : state;
    });
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

  it('should undo on Ctrl+Z', async () => {
    renderHook(() => useUndoRedo());

    await waitFor(() => {
      expect(eventListener).toBeTruthy();
    });

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    if (eventListener) {
      eventListener(event);
    }

    await waitFor(() => {
      expect(mockUndo).toHaveBeenCalled();
    });
  });

  it('should redo on Ctrl+Shift+Z', async () => {
    renderHook(() => useUndoRedo());

    await waitFor(() => {
      expect(eventListener).toBeTruthy();
    });

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    if (eventListener) {
      eventListener(event);
    }

    await waitFor(() => {
      expect(mockRedo).toHaveBeenCalled();
    });
  });

  it('should redo on Ctrl+Y', async () => {
    renderHook(() => useUndoRedo());

    await waitFor(() => {
      expect(eventListener).toBeTruthy();
    });

    const event = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    if (eventListener) {
      eventListener(event);
    }

    await waitFor(() => {
      expect(mockRedo).toHaveBeenCalled();
    });
  });
});
