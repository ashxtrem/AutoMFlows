import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderDbDisconnectProperties } from '../dbDisconnect';

describe('renderDbDisconnectProperties', () => {
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
    const result = renderDbDisconnectProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render connectionKey field', () => {
    const result = renderDbDisconnectProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Connection Key');
  });

  it('should call handleOpenPopup when clicking connection key field', () => {
    const result = renderDbDisconnectProperties(defaultProps);
    const { container } = render(<>{result}</>);
    const clickableDiv = container.querySelector('.cursor-text')!;
    fireEvent.click(clickableDiv);
    expect(mockHandleOpenPopup).toHaveBeenCalled();
  });
});
