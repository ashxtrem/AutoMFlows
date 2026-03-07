import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useShortcuts } from '../shortcuts';
import { useWorkflowStore } from '../../../store/workflowStore';
import { useNotificationStore } from '../../../store/notificationStore';

const mockSelectAllNodes = vi.fn();
const mockDeleteNode = vi.fn();
const mockDuplicateNode = vi.fn();
const mockCopyNode = vi.fn();
const mockPasteNode = vi.fn();
const mockClearSelection = vi.fn();
const mockSetFollowModeEnabled = vi.fn();
const mockAddNotification = vi.fn();

const makeState = (overrides: Record<string, any> = {}) => ({
  selectedNodeIds: new Set<string>(),
  canvasReloading: false,
  selectAllNodes: mockSelectAllNodes,
  deleteNode: mockDeleteNode,
  duplicateNode: mockDuplicateNode,
  copyNode: mockCopyNode,
  pasteNode: mockPasteNode,
  clearSelection: mockClearSelection,
  nodes: [{ id: 'n1' }, { id: 'n2' }],
  followModeEnabled: false,
  setFollowModeEnabled: mockSetFollowModeEnabled,
  selectedNode: null,
  clipboard: null,
  ...overrides,
});

let currentState = makeState();

vi.mock('../../../store/workflowStore', () => ({
  useWorkflowStore: Object.assign(
    vi.fn((selector?: any) => (selector ? selector(currentState) : currentState)),
    { getState: vi.fn(() => currentState) }
  ),
}));

vi.mock('../../../store/notificationStore', () => ({
  useNotificationStore: vi.fn((selector?: any) => {
    const state = { addNotification: mockAddNotification };
    return selector ? selector(state) : state;
  }),
}));

describe('useShortcuts', () => {
  const mockScreenToFlowPosition = vi.fn((pos) => pos);
  const mockSetNodes = vi.fn();
  const mockReactFlowWrapper = { current: document.createElement('div') };
  const mockNavigateToFailedNode = vi.fn();
  const mockSetNodeSearchOverlayOpen = vi.fn();

  const defaultProps = {
    screenToFlowPosition: mockScreenToFlowPosition,
    setNodes: mockSetNodes,
    reactFlowWrapper: mockReactFlowWrapper as any,
    nodeSearchOverlayOpen: false,
    setNodeSearchOverlayOpen: mockSetNodeSearchOverlayOpen,
    navigateToFailedNode: mockNavigateToFailedNode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentState = makeState();
    (useWorkflowStore as any).mockImplementation(
      (selector?: any) => (selector ? selector(currentState) : currentState)
    );
    (useWorkflowStore.getState as any).mockImplementation(() => currentState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Ctrl+Shift+F calls navigateToFailedNode', () => {
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'F', ctrlKey: true, shiftKey: true });
    expect(mockNavigateToFailedNode).toHaveBeenCalledOnce();
  });

  it('Ctrl+Shift+L toggles follow mode and shows notification', () => {
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'L', ctrlKey: true, shiftKey: true });
    expect(mockSetFollowModeEnabled).toHaveBeenCalledWith(true);
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', title: 'Follow Mode' })
    );
  });

  it('Ctrl+F calls setNodeSearchOverlayOpen(true)', () => {
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(mockSetNodeSearchOverlayOpen).toHaveBeenCalledWith(true);
  });

  it('Delete calls deleteNode with selected node ids', () => {
    currentState = makeState({ selectedNodeIds: new Set(['n1', 'n2']) });
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(mockDeleteNode).toHaveBeenCalledWith(['n1', 'n2']);
  });

  it('Ctrl+A calls selectAllNodes and updates ReactFlow selection', () => {
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    expect(mockSelectAllNodes).toHaveBeenCalledOnce();
    expect(mockSetNodes).toHaveBeenCalled();
  });

  it('Ctrl+D calls duplicateNode with selected node ids', () => {
    currentState = makeState({ selectedNodeIds: new Set(['n1']) });
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    expect(mockDuplicateNode).toHaveBeenCalledWith(['n1']);
  });

  it('Ctrl+C calls copyNode with selected node ids', () => {
    currentState = makeState({ selectedNodeIds: new Set(['n2']) });
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    expect(mockCopyNode).toHaveBeenCalledWith(['n2']);
  });

  it('Escape calls clearSelection and deselects all nodes', () => {
    currentState = makeState({ selectedNodeIds: new Set(['n1']) });
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockClearSelection).toHaveBeenCalledOnce();
    expect(mockSetNodes).toHaveBeenCalled();
  });

  it('shortcuts are suppressed when an input element is focused', () => {
    renderHook(() => useShortcuts(defaultProps));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    expect(mockSelectAllNodes).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Delete' });
    expect(mockDeleteNode).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('shortcuts are suppressed when selectedNode exists (properties panel open)', () => {
    currentState = makeState({
      selectedNode: { id: 'n1' },
      selectedNodeIds: new Set(['n1']),
    });
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    expect(mockDuplicateNode).not.toHaveBeenCalled();
  });

  it('shortcuts are suppressed when canvasReloading is true', () => {
    currentState = makeState({ canvasReloading: true });
    renderHook(() => useShortcuts(defaultProps));
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    expect(mockSelectAllNodes).not.toHaveBeenCalled();
  });
});
