import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderLoadConfigFileProperties } from '../loadConfigFile';

describe('renderLoadConfigFileProperties', () => {
  const mockSetSelectedNode = vi.fn();
  const mockStoreNodes = [{ id: 'test-node', data: {} }];

  const defaultProps = {
    renderData: {},
    handlePropertyChange: vi.fn(),
    handleOpenPopup: vi.fn(),
    renderPropertyRow: vi.fn((name, element, index) => element),
    id: 'test-node',
    storeNodes: mockStoreNodes,
    setSelectedNode: mockSetSelectedNode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default values', () => {
    const result = renderLoadConfigFileProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render Load Config button when no configs', () => {
    const result = renderLoadConfigFileProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Load Config');
  });

  it('should render Add Config button when configs exist', () => {
    const props = {
      ...defaultProps,
      renderData: { configs: [{ enabled: true }] },
    };
    const result = renderLoadConfigFileProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Add Config');
  });
});
