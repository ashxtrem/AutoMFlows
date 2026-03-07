import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasHandlers } from '../handlers';
import { useWorkflowStore } from '../../../store/workflowStore';

const mockSetSelectedNodeIds = vi.fn();
const mockSetSelectedGroupId = vi.fn();
const mockShowErrorPopupForNode = vi.fn();
const mockAddNode = vi.fn();

const makeState = (overrides: Record<string, any> = {}) => ({
  setSelectedNodeIds: mockSetSelectedNodeIds,
  setSelectedGroupId: mockSetSelectedGroupId,
  failedNodes: new Map(),
  showErrorPopupForNode: mockShowErrorPopupForNode,
  selectedNodeIds: new Set<string>(),
  nodes: [],
  addNode: mockAddNode,
  ...overrides,
});

let currentState = makeState();

vi.mock('../../../store/workflowStore', () => ({
  useWorkflowStore: Object.assign(
    vi.fn((selector?: any) => (selector ? selector(currentState) : currentState)),
    { getState: vi.fn(() => currentState) }
  ),
}));

describe('useCanvasHandlers', () => {
  const mockScreenToFlowPosition = vi.fn((pos) => pos);
  const mockSetNodes = vi.fn();
  const mockGetNodes = vi.fn(() => []);
  const mockReactFlowWrapper = { current: document.createElement('div') };
  const mockHideSidebar = vi.fn();

  const defaultProps = {
    screenToFlowPosition: mockScreenToFlowPosition,
    setNodes: mockSetNodes,
    getNodes: mockGetNodes,
    reactFlowWrapper: mockReactFlowWrapper as any,
    hideSidebar: mockHideSidebar,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentState = makeState();
    (useWorkflowStore as any).mockImplementation(
      (selector?: any) => (selector ? selector(currentState) : currentState)
    );
    (useWorkflowStore.getState as any).mockImplementation(() => currentState);
  });

  it('onDragOver prevents default and sets dropEffect to move', () => {
    const { result } = renderHook(() => useCanvasHandlers(defaultProps));
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
    } as any;

    result.current.onDragOver(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.dataTransfer.dropEffect).toBe('move');
  });

  it('onNodeContextMenu sets contextMenu with x, y, and nodeId', () => {
    const { result } = renderHook(() => useCanvasHandlers(defaultProps));

    act(() => {
      result.current.onNodeContextMenu(
        { preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 200, clientY: 300 } as any,
        { id: 'node-42' }
      );
    });

    expect(result.current.contextMenu).toEqual({
      x: 200,
      y: 300,
      nodeId: 'node-42',
    });
  });

  it('isValidConnection returns true when source and sourceHandle are present', () => {
    const { result } = renderHook(() => useCanvasHandlers(defaultProps));

    expect(result.current.isValidConnection({ source: 'n1', sourceHandle: 'out' })).toBeTruthy();
    expect(result.current.isValidConnection({ source: 'n1', sourceHandle: null })).toBeFalsy();
    expect(result.current.isValidConnection({ source: null, sourceHandle: 'out' })).toBeFalsy();
    expect(result.current.isValidConnection({ source: null, sourceHandle: null })).toBeFalsy();
  });

  it('onPaneClick clears selectedNodeIds and selectedGroupId', () => {
    const { result } = renderHook(() => useCanvasHandlers(defaultProps));

    act(() => {
      result.current.onPaneClick({
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any);
    });

    expect(mockSetSelectedNodeIds).toHaveBeenCalledWith([]);
    expect(mockSetSelectedGroupId).toHaveBeenCalledWith(null);
  });

  it('onDrop with application/reactflow data calls addNode at flow position', () => {
    const { result } = renderHook(() => useCanvasHandlers(defaultProps));

    act(() => {
      result.current.onDrop({
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn(() => 'browser.click') },
        clientX: 400,
        clientY: 500,
      } as any);
    });

    expect(mockScreenToFlowPosition).toHaveBeenCalledWith({ x: 400, y: 500 });
    expect(mockAddNode).toHaveBeenCalledWith('browser.click', { x: 400, y: 500 });
  });

  it('onDrop does nothing when no type data is present', () => {
    const { result } = renderHook(() => useCanvasHandlers(defaultProps));

    act(() => {
      result.current.onDrop({
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn(() => '') },
        clientX: 0,
        clientY: 0,
      } as any);
    });

    expect(mockAddNode).not.toHaveBeenCalled();
  });
});
