import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderWaitProperties } from '../wait';

describe('renderWaitProperties', () => {
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
    const result = renderWaitProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render waitType select', () => {
    const result = renderWaitProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Wait Type');
  });

  it('should render timeout value for timeout waitType', () => {
    const props = {
      ...defaultProps,
      renderData: { waitType: 'timeout' },
    };
    const result = renderWaitProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Value');
  });

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderWaitProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'selector' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('waitType', 'selector');
  });
});
