import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanvasHandlers } from '../handlers';
import { useWorkflowStore } from '../../../store/workflowStore';

vi.mock('../../../store/workflowStore', () => ({
  useWorkflowStore: vi.fn((selector) => {
    const state = {
      setSelectedNodeIds: vi.fn(),
      setSelectedGroupId: vi.fn(),
      failedNodes: new Map(),
      showErrorPopupForNode: vi.fn(),
      selectedNodeIds: new Set(),
      nodes: [],
    };
    return selector ? selector(state) : state;
  }),
}));

describe('useCanvasHandlers', () => {
  const mockScreenToFlowPosition = vi.fn((pos) => pos);
  const mockSetNodes = vi.fn();
  const mockGetNodes = vi.fn(() => []);
  const mockReactFlowWrapper = { current: document.createElement('div') };

  const defaultProps = {
    screenToFlowPosition: mockScreenToFlowPosition,
    setNodes: mockSetNodes,
    getNodes: mockGetNodes,
    reactFlowWrapper: mockReactFlowWrapper as any,
    hideSidebar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return handlers', () => {
    const { result } = renderHook(() => useCanvasHandlers(defaultProps));
    expect(result.current.onNodeClick).toBeDefined();
    expect(result.current.onPaneClick).toBeDefined();
    expect(result.current.onDrop).toBeDefined();
    expect(result.current.onDragOver).toBeDefined();
  });

  it('should handle drag over', () => {
    const { result } = renderHook(() => useCanvasHandlers(defaultProps));
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
    } as any;
    result.current.onDragOver(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});
