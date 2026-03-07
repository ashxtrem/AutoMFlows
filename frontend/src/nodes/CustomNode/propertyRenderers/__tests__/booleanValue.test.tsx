import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderBooleanValueProperties } from '../booleanValue';

describe('renderBooleanValueProperties', () => {
  const mockHandlePropertyChange = vi.fn();

  const defaultProps = {
    renderData: {},
    handlePropertyChange: mockHandlePropertyChange,
    handleOpenPopup: vi.fn(),
    renderPropertyRow: vi.fn((name, element, index) => element),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with Value label', () => {
    const result = renderBooleanValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Value');
  });

  it('should display false by default when value is undefined', () => {
    const result = renderBooleanValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('False');
  });

  it('should display True when value is true', () => {
    const result = renderBooleanValueProperties({ ...defaultProps, renderData: { value: true } });
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('True');
  });

  it('should display False when value is null', () => {
    const result = renderBooleanValueProperties({ ...defaultProps, renderData: { value: null } });
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('False');
  });

  it('should call handlePropertyChange with true when selecting true', () => {
    const result = renderBooleanValueProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const valueDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(valueDiv);

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'true' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('value', true);
  });

  it('should call handlePropertyChange with false when selecting false', () => {
    const result = renderBooleanValueProperties({ ...defaultProps, renderData: { value: true } });
    const { container } = render(<>{result}</>);

    const valueDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(valueDiv);

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'false' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('value', false);
  });
});
