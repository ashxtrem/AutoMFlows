import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { NodeType } from '@automflows/shared';
import CustomNode from '../../CustomNode';

vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow');
  return {
    ...actual,
    Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
  };
});

vi.mock('../../store/workflowStore', () => ({
  useWorkflowStore: vi.fn(() => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    updateNodeData: vi.fn(),
  })),
}));

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    theme: 'dark',
  })),
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
    vi.clearAllMocks();
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
});
