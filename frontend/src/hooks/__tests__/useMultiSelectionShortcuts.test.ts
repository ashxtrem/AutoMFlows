import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMultiSelectionShortcuts } from '../useMultiSelectionShortcuts';
import { useWorkflowStore } from '../../store/workflowStore';
import { useReactFlow } from 'reactflow';

vi.mock('../../store/workflowStore');
vi.mock('reactflow');

describe('useMultiSelectionShortcuts', () => {
  const mockDeleteNode = vi.fn();
  const mockDuplicateNode = vi.fn();
  const mockCopyNode = vi.fn();
  const mockPasteNode = vi.fn();
  const mockClearSelection = vi.fn();
  const mockScreenToFlowPosition = vi.fn(() => ({ x: 0, y: 0 }));

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      selectedNodeIds: new Set(['n1']),
      deleteNode: mockDeleteNode,
      duplicateNode: mockDuplicateNode,
      copyNode: mockCopyNode,
      pasteNode: mockPasteNode,
      clearSelection: mockClearSelection,
      canvasReloading: false,
      selectedNode: null,
      clipboard: null,
    });
    (useReactFlow as any).mockReturnValue({
      screenToFlowPosition: mockScreenToFlowPosition,
    });
  });

  it('should delete nodes on Delete key', () => {
    renderHook(() => useMultiSelectionShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockDeleteNode).toHaveBeenCalledWith(['n1']);
  });

  it('should duplicate nodes on Ctrl+D', () => {
    renderHook(() => useMultiSelectionShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'd',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockDuplicateNode).toHaveBeenCalled();
  });
});
