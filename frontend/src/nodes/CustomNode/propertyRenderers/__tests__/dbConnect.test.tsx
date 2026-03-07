import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
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

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderDbConnectProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'mysql' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('dbType', 'mysql');
  });
});
