import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderDbConnectProperties } from '../dbConnect';

describe('renderDbConnectProperties', () => {
  const mockHandlePropertyChange = vi.fn();
  const mockHandleOpenPopup = vi.fn();
  const mockRenderPropertyRow = vi.fn((name, element, index) => element);

  const defaultProps = {
    renderData: {},
    handlePropertyChange: mockHandlePropertyChange,
    handleOpenPopup: mockHandleOpenPopup,
    renderPropertyRow: mockRenderPropertyRow,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default values', () => {
    const result = renderDbConnectProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render dbType select', () => {
    const result = renderDbConnectProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('DB Type');
  });

  it('should render connectionKey field', () => {
    const result = renderDbConnectProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Connection Key');
  });
});
