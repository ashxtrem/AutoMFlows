import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderIntValueProperties } from '../intValue';

describe('renderIntValueProperties', () => {
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

  it('should render with Value label', () => {
    const result = renderIntValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Value');
  });

  it('should display 0 by default when value is undefined', () => {
    const result = renderIntValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('0');
  });

  it('should display existing value', () => {
    const result = renderIntValueProperties({ ...defaultProps, renderData: { value: 42 } });
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('42');
  });

  it('should display 0 when value is null', () => {
    const result = renderIntValueProperties({ ...defaultProps, renderData: { value: null } });
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('0');
  });

  it('should call handleOpenPopup when clicked', () => {
    const result = renderIntValueProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const clickableDiv = container.querySelector('.cursor-text')!;
    fireEvent.click(clickableDiv);

    expect(mockHandleOpenPopup).toHaveBeenCalledWith(
      'number', 'Value', 0, expect.any(Function), '0', undefined, undefined, 'value'
    );
  });

  it('should pass onChange that calls handlePropertyChange', () => {
    const result = renderIntValueProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const clickableDiv = container.querySelector('.cursor-text')!;
    fireEvent.click(clickableDiv);

    const onChangeFn = mockHandleOpenPopup.mock.calls[0][3];
    onChangeFn(99);

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('value', 99);
  });
});
