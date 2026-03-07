import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderStringValueProperties } from '../stringValue';

describe('renderStringValueProperties', () => {
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
    const result = renderStringValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Value');
  });

  it('should display existing value', () => {
    const result = renderStringValueProperties({ ...defaultProps, renderData: { value: 'hello world' } });
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('hello world');
  });

  it('should display placeholder when value is empty', () => {
    const result = renderStringValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Enter string value');
  });

  it('should call handleOpenPopup when clicked', () => {
    const result = renderStringValueProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const clickableDiv = container.querySelector('.cursor-text')!;
    fireEvent.click(clickableDiv);

    expect(mockHandleOpenPopup).toHaveBeenCalledWith(
      'text', 'Value', '', expect.any(Function), 'Enter string value', undefined, undefined, 'value'
    );
  });

  it('should pass onChange that calls handlePropertyChange', () => {
    const result = renderStringValueProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const clickableDiv = container.querySelector('.cursor-text')!;
    fireEvent.click(clickableDiv);

    const onChangeFn = mockHandleOpenPopup.mock.calls[0][3];
    onChangeFn('new value');

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('value', 'new value');
  });
});
