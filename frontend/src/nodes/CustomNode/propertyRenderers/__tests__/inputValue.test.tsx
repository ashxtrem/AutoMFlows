import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PropertyDataType } from '@automflows/shared';
import { renderInputValueProperties } from '../inputValue';

describe('renderInputValueProperties', () => {
  const mockHandlePropertyChange = vi.fn();
  const mockHandleOpenPopup = vi.fn();

  const defaultProps = {
    renderData: {},
    handlePropertyChange: mockHandlePropertyChange,
    handleOpenPopup: mockHandleOpenPopup,
    renderPropertyRow: vi.fn((name, element, index) => element),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default values', () => {
    const result = renderInputValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
    expect(container.textContent).toContain('Data Type');
  });

  it('should render string input for STRING data type', () => {
    const props = {
      ...defaultProps,
      renderData: { dataType: PropertyDataType.STRING },
    };
    const result = renderInputValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Value');
  });

  it('should render number input for INT data type', () => {
    const props = {
      ...defaultProps,
      renderData: { dataType: PropertyDataType.INT },
    };
    const result = renderInputValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Value');
  });

  it('should render boolean select for BOOLEAN data type', () => {
    const props = {
      ...defaultProps,
      renderData: { dataType: PropertyDataType.BOOLEAN },
    };
    const result = renderInputValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Value');
  });

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderInputValueProperties(defaultProps);
    const { container } = render(<>{result}</>);

    // Click to enter edit mode
    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    // Now find the <select> and change its value
    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'int' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('dataType', 'int');
  });
});
