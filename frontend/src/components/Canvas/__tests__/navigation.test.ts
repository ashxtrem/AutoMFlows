import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNavigation } from '../navigation';
import { useWorkflowStore } from '../../../store/workflowStore';

const mockSetNavigateToFailedNode = vi.fn();
const mockSetNavigateToPausedNode = vi.fn();

let mockStoreState: Record<string, any>;

const resetStoreState = (overrides: Record<string, any> = {}) => {
  mockStoreState = {
    failedNodes: new Map([['node-1', { message: 'Error' }]]),
    executingNodeId: 'node-2',
    pausedNodeId: 'node-3',
    setNavigateToFailedNode: mockSetNavigateToFailedNode,
    setNavigateToPausedNode: mockSetNavigateToPausedNode,
    ...overrides,
  };
};

vi.mock('../../../store/workflowStore', () => ({
  useWorkflowStore: Object.assign(
    vi.fn((selector?: any) => {
      return selector ? selector(mockStoreState) : mockStoreState;
    }),
    {
      getState: vi.fn(() => mockStoreState),
    }
  ),
}));

describe('useNavigation', () => {
  const mockFitView = vi.fn();
  const mockNodes = [
    { id: 'node-1', data: { type: 'action' } },
    { id: 'node-2', data: { type: 'start' } },
    { id: 'node-3', data: { type: 'action' } },
  ] as any;

  const defaultProps = {
    fitView: mockFitView,
    nodes: mockNodes,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetStoreState();
    (useWorkflowStore as any).mockImplementation(
      (selector?: any) => (selector ? selector(mockStoreState) : mockStoreState)
    );
    (useWorkflowStore.getState as any).mockImplementation(() => mockStoreState);
  });

  it('navigateToFailedNode calls fitView with correct node and options', () => {
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToFailedNode();
    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: 'node-1' }],
      padding: 0.2,
      duration: 300,
    });
  });

  it('navigateToPausedNode calls fitView with correct node and options', () => {
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToPausedNode();
    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: 'node-3' }],
      padding: 0.2,
      duration: 300,
    });
  });

  it('navigateToExecutingNode calls fitView with correct node and options', () => {
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToExecutingNode();
    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: 'node-2' }],
      padding: 0.2,
      duration: 300,
    });
  });

  it('navigateToFailedNode does not call fitView when failedNodes is empty', () => {
    resetStoreState({ failedNodes: new Map() });
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToFailedNode();
    expect(mockFitView).not.toHaveBeenCalled();
  });

  it('navigateToPausedNode does not call fitView when pausedNodeId is null', () => {
    resetStoreState({ pausedNodeId: null });
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToPausedNode();
    expect(mockFitView).not.toHaveBeenCalled();
  });

  it('navigateToExecutingNode does not call fitView when executingNodeId is null', () => {
    resetStoreState({ executingNodeId: null });
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToExecutingNode();
    expect(mockFitView).not.toHaveBeenCalled();
  });
});
