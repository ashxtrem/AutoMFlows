import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { NodeType } from '@automflows/shared';
import CustomNode from '../../CustomNode';
import { useWorkflowStore } from '../../../store/workflowStore';

vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow');
  return {
    ...actual,
    Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
  };
});

function createMockState(overrides: { nodes?: Array<{ id: string; data: Record<string, unknown> }> } = {}) {
  return {
    nodes: overrides.nodes ?? [],
    edges: [],
    pausedNodeId: null,
    updateNodeData: vi.fn(),
    updateNodeDimensions: vi.fn(),
    renameNode: vi.fn(),
    setSelectedNode: vi.fn(),
    failedNodes: new Set<string>(),
    validationErrors: new Set<string>(),
    executingNodeId: null,
    showErrorPopupForNode: vi.fn(),
    // NodeMenuBar and other consumers when calling useWorkflowStore() with no selector
    copyNode: vi.fn(),
    duplicateNode: vi.fn(),
    deleteNode: vi.fn(),
    toggleBypass: vi.fn(),
    toggleMinimize: vi.fn(),
    togglePin: vi.fn(),
    toggleBreakpoint: vi.fn(),
    selectedNodeIds: new Set<string>(),
  };
}

vi.mock('../../../store/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((selector: (s: { appearance: { theme: string } }) => unknown) =>
    selector({ appearance: { theme: 'dark' } })
  ),
}));

describe('CustomNode', () => {
  const defaultProps = {
    id: 'test-node',
    data: {
      type: NodeType.START,
      label: 'Test Node',
    },
    selected: false,
  };

  beforeEach(() => {
    vi.mocked(useWorkflowStore).mockImplementation((selector?: (s: unknown) => unknown) => {
      const state = createMockState();
      return typeof selector === 'function' ? selector(state) : state;
    });
  });

  it('should render node with basic props', () => {
    const { container } = render(
      <ReactFlowProvider>
        <CustomNode {...defaultProps} />
      </ReactFlowProvider>
    );
    expect(container).toBeTruthy();
  });

  it('should render node with different node types', () => {
    const actionNodeProps = {
      ...defaultProps,
      data: {
        type: NodeType.ACTION,
        label: 'Action Node',
      },
    };
    const { container } = render(
      <ReactFlowProvider>
        <CustomNode {...actionNodeProps} />
      </ReactFlowProvider>
    );
    expect(container).toBeTruthy();
  });

  it('should handle selected state', () => {
    const selectedProps = {
      ...defaultProps,
      selected: true,
    };
    const { container } = render(
      <ReactFlowProvider>
        <CustomNode {...selectedProps} />
      </ReactFlowProvider>
    );
    expect(container).toBeTruthy();
  });

  it('should show (breakpoint) in header when node has breakpoint enabled', () => {
    vi.mocked(useWorkflowStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector(
        createMockState({
          nodes: [
            {
              id: 'test-node',
              data: { type: NodeType.START, label: 'Test Node', breakpoint: true },
            },
          ],
        })
      )
    );
    render(
      <ReactFlowProvider>
        <CustomNode {...defaultProps} />
      </ReactFlowProvider>
    );
    expect(screen.getByText(/\(breakpoint\)/)).toBeInTheDocument();
  });

  it('should show (support) in header when node is marked as support (isTest false)', () => {
    vi.mocked(useWorkflowStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector(
        createMockState({
          nodes: [
            {
              id: 'test-node',
              data: { type: NodeType.START, label: 'Test Node', isTest: false },
            },
          ],
        })
      )
    );
    render(
      <ReactFlowProvider>
        <CustomNode {...defaultProps} />
      </ReactFlowProvider>
    );
    expect(screen.getByText(/\(support\)/)).toBeInTheDocument();
  });
});
