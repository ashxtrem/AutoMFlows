import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderContextManipulateProperties } from '../contextManipulate';

describe('renderContextManipulateProperties', () => {
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
    const result = renderContextManipulateProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderContextManipulateProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderContextManipulateProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'setGeolocation' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('action', 'setGeolocation');
  });
});
