import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderFormInputProperties } from '../formInput';

describe('renderFormInputProperties', () => {
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
    const result = renderFormInputProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderFormInputProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render values field for select action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'select' },
    };
    const result = renderFormInputProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Values');
  });

  it('should render filePaths field for upload action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'upload' },
    };
    const result = renderFormInputProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('File Paths');
  });

  it('should render timeout field', () => {
    const result = renderFormInputProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Timeout');
  });

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderFormInputProperties(defaultProps);
    const { container } = render(<>{result}</>);

    // Click to enter edit mode
    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    // Now find the <select> and change its value
    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'check' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('action', 'check');
  });
});
