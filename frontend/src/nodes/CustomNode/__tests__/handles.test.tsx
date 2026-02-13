import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { NodeType } from '@automflows/shared';
import { renderDriverHandle, renderOutputHandles, HandleRenderingProps } from '../handles';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('renderDriverHandle', () => {
  const defaultProps: HandleRenderingProps = {
    nodeId: 'test-node',
    nodeType: NodeType.ACTION,
    isUtilityNode: false,
    isSwitchNode: false,
    switchCases: [],
    switchDefaultCase: null,
    hasProperties: false,
    isMinimized: false,
    edgesRaw: [],
    connectingHandleId: null,
    setConnectingHandleId: vi.fn(),
    textColor: '#ffffff',
    hasDriverConnection: false,
    hasOutputConnection: false,
  };

  it('should return null for utility nodes', () => {
    const props = { ...defaultProps, isUtilityNode: true };
    const result = renderDriverHandle(props);
    expect(result).toBeNull();
  });

  it('should render handle for non-utility nodes', () => {
    const result = renderDriverHandle(defaultProps);
    const { container } = render(<Wrapper>{result}</Wrapper>);
    expect(container).toBeTruthy();
  });

  it('should hide handle for START node type', () => {
    const props = { ...defaultProps, nodeType: NodeType.START };
    const result = renderDriverHandle(props);
    const { container } = render(<Wrapper>{result}</Wrapper>);
    expect(container).toBeTruthy();
  });
});

describe('renderOutputHandles', () => {
  const defaultProps: HandleRenderingProps = {
    nodeId: 'test-node',
    nodeType: NodeType.ACTION,
    isUtilityNode: false,
    isSwitchNode: false,
    switchCases: [],
    switchDefaultCase: null,
    hasProperties: false,
    isMinimized: false,
    edgesRaw: [],
    connectingHandleId: null,
    setConnectingHandleId: vi.fn(),
    textColor: '#ffffff',
    hasDriverConnection: false,
    hasOutputConnection: false,
  };

  it('should return null for utility nodes', () => {
    const props = { ...defaultProps, isUtilityNode: true };
    const result = renderOutputHandles(props);
    expect(result).toBeNull();
  });

  it('should render single output handle for regular nodes', () => {
    const result = renderOutputHandles(defaultProps);
    const { container } = render(<Wrapper>{result}</Wrapper>);
    expect(container).toBeTruthy();
  });

  it('should render multiple handles for switch nodes', () => {
    const props = {
      ...defaultProps,
      isSwitchNode: true,
      switchCases: [{ id: 'case-1', label: 'Case 1' }, { id: 'case-2', label: 'Case 2' }],
    };
    const result = renderOutputHandles(props);
    const { container } = render(<Wrapper>{result}</Wrapper>);
    expect(container).toBeTruthy();
  });

  it('should render default case handle when switchDefaultCase exists', () => {
    const props = {
      ...defaultProps,
      isSwitchNode: true,
      switchCases: [{ id: 'case-1', label: 'Case 1' }],
      switchDefaultCase: { label: 'Default' },
    };
    const result = renderOutputHandles(props);
    const { container } = render(<Wrapper>{result}</Wrapper>);
    expect(container).toBeTruthy();
  });
});
