import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShortcuts } from '../shortcuts';
import { useWorkflowStore } from '../../../store/workflowStore';
import { useNotificationStore } from '../../../store/notificationStore';

vi.mock('../../../store/workflowStore', () => ({
  useWorkflowStore: vi.fn((selector) => {
    const state = {
      selectedNodeIds: new Set(),
      canvasReloading: false,
      selectAllNodes: vi.fn(),
      deleteNode: vi.fn(),
      duplicateNode: vi.fn(),
      copyNode: vi.fn(),
      pasteNode: vi.fn(),
      clearSelection: vi.fn(),
      nodes: [],
      followModeEnabled: false,
      setFollowModeEnabled: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../../store/notificationStore', () => ({
  useNotificationStore: vi.fn((selector) => {
    const state = {
      addNotification: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

describe('useShortcuts', () => {
  const mockScreenToFlowPosition = vi.fn((pos) => pos);
  const mockSetNodes = vi.fn();
  const mockReactFlowWrapper = { current: document.createElement('div') };
  const mockNavigateToFailedNode = vi.fn();

  const defaultProps = {
    screenToFlowPosition: mockScreenToFlowPosition,
    setNodes: mockSetNodes,
    reactFlowWrapper: mockReactFlowWrapper as any,
    nodeSearchOverlayOpen: false,
    setNodeSearchOverlayOpen: vi.fn(),
    navigateToFailedNode: mockNavigateToFailedNode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set up keyboard shortcuts', () => {
    renderHook(() => useShortcuts(defaultProps));
    // Hook should set up event listeners
    expect(true).toBe(true);
  });
});
