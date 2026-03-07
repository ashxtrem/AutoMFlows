import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderDialogProperties } from '../dialog';

describe('renderDialogProperties', () => {
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
    const result = renderDialogProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderDialogProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render timeout field', () => {
    const result = renderDialogProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Timeout');
  });

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderDialogProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'dismiss' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('action', 'dismiss');
  });
});
