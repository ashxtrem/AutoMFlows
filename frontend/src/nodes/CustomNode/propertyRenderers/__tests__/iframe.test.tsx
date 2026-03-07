import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderIframeProperties } from '../iframe';

describe('renderIframeProperties', () => {
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
    const result = renderIframeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderIframeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render timeout field', () => {
    const result = renderIframeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Timeout');
  });

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderIframeProperties(defaultProps);
    const { container } = render(<>{result}</>);

    // Click to enter edit mode
    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    // Now find the <select> and change its value
    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'switchToMainFrame' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('action', 'switchToMainFrame');
  });
});
