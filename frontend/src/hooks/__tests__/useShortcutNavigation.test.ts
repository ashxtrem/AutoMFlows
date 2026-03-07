import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useShortcutNavigation } from '../useShortcutNavigation';
import { useWorkflowStore } from '../../store/workflowStore';
import { useReactFlow } from 'reactflow';

vi.mock('../../store/workflowStore');
vi.mock('reactflow');

describe('useShortcutNavigation', () => {
  const mockFitView = vi.fn();
  const mockSetNodes = vi.fn();
  const mockNodes = [
    {
      id: 'n1',
      data: { type: 'shortcut.shortcut', shortcut: 'a' },
      position: { x: 100, y: 100 },
    },
  ];
  const mockGetNodes = vi.fn(() => mockNodes);

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockImplementation((selector: any) => {
      const state = {
        nodes: mockNodes,
        selectedNode: null,
        errorPopupNodeId: null,
        canvasReloading: false,
      };
      return selector ? selector(state) : state;
    });
    (useReactFlow as any).mockReturnValue({
      fitView: mockFitView,
      setNodes: mockSetNodes,
      getNodes: mockGetNodes,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pressing matching shortcut key calls fitView with correct args', () => {
    renderHook(() => useShortcutNavigation());

    fireEvent.keyDown(window, { key: 'a' });

    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: 'n1' }],
      padding: 0.2,
      duration: 300,
    });
    expect(mockSetNodes).toHaveBeenCalled();
  });

  it('pressing non-matching key does not call fitView', () => {
    renderHook(() => useShortcutNavigation());

    fireEvent.keyDown(window, { key: 'b' });

    expect(mockFitView).not.toHaveBeenCalled();
    expect(mockSetNodes).not.toHaveBeenCalled();
  });

  it('shortcut is suppressed when selectedNode is set', () => {
    (useWorkflowStore as any).mockImplementation((selector: any) => {
      const state = {
        nodes: mockNodes,
        selectedNode: { id: 'some-node' },
        errorPopupNodeId: null,
        canvasReloading: false,
      };
      return selector ? selector(state) : state;
    });

    renderHook(() => useShortcutNavigation());

    fireEvent.keyDown(window, { key: 'a' });

    expect(mockFitView).not.toHaveBeenCalled();
  });

  it('shortcut is suppressed when input element is focused', () => {
    renderHook(() => useShortcutNavigation());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(window, { key: 'a' });

    expect(mockFitView).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('shortcut is suppressed when modifier key is held', () => {
    renderHook(() => useShortcutNavigation());

    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });

    expect(mockFitView).not.toHaveBeenCalled();
  });

  it('shortcut is suppressed when canvasReloading is true', () => {
    (useWorkflowStore as any).mockImplementation((selector: any) => {
      const state = {
        nodes: mockNodes,
        selectedNode: null,
        errorPopupNodeId: null,
        canvasReloading: true,
      };
      return selector ? selector(state) : state;
    });

    renderHook(() => useShortcutNavigation());

    fireEvent.keyDown(window, { key: 'a' });

    expect(mockFitView).not.toHaveBeenCalled();
  });
});
