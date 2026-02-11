import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSelectAllShortcut } from '../useSelectAllShortcut';
import { useWorkflowStore } from '../../store/workflowStore';

vi.mock('../../store/workflowStore');

describe('useSelectAllShortcut', () => {
  const mockSelectAllNodes = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      selectAllNodes: mockSelectAllNodes,
      canvasReloading: false,
      selectedNode: null,
    });
  });

  it('should select all nodes on Ctrl+A', () => {
    renderHook(() => useSelectAllShortcut());

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockSelectAllNodes).toHaveBeenCalled();
  });

  it('should not trigger when input is focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useSelectAllShortcut());

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockSelectAllNodes).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
