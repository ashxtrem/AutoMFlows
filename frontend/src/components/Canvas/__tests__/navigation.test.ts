import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNavigation } from '../navigation';
import { useWorkflowStore } from '../../../store/workflowStore';

const mockSetNavigateToFailedNode = vi.fn();
const mockSetNavigateToPausedNode = vi.fn();

const mockStoreState = {
  failedNodes: new Map([['node-1', { message: 'Error' }]]),
  executingNodeId: 'node-2',
  pausedNodeId: 'node-3',
  setNavigateToFailedNode: mockSetNavigateToFailedNode,
  setNavigateToPausedNode: mockSetNavigateToPausedNode,
};

vi.mock('../../../store/workflowStore', () => ({
  useWorkflowStore: Object.assign(
    vi.fn((selector) => {
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
  });

  it('should return navigation functions', () => {
    const { result } = renderHook(() => useNavigation(defaultProps));
    expect(result.current.navigateToFailedNode).toBeDefined();
    expect(result.current.navigateToPausedNode).toBeDefined();
    expect(result.current.navigateToExecutingNode).toBeDefined();
  });

  it('should navigate to failed node', () => {
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToFailedNode();
    expect(mockFitView).toHaveBeenCalled();
  });

  it('should navigate to paused node', () => {
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToPausedNode();
    expect(mockFitView).toHaveBeenCalled();
  });

  it('should navigate to executing node', () => {
    const { result } = renderHook(() => useNavigation(defaultProps));
    result.current.navigateToExecutingNode();
    expect(mockFitView).toHaveBeenCalled();
  });
});
