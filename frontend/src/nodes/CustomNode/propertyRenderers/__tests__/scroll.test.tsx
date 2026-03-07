import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderScrollProperties } from '../scroll';

describe('renderScrollProperties', () => {
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
    const result = renderScrollProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderScrollProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render selector field for scrollToElement action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'scrollToElement' },
    };
    const result = renderScrollProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Selector');
  });

  it('should render x and y fields for scrollToPosition action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'scrollToPosition' },
    };
    const result = renderScrollProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('X');
    expect(container.textContent).toContain('Y');
  });

  it('should render deltaX and deltaY fields for scrollBy action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'scrollBy' },
    };
    const result = renderScrollProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Delta X');
    expect(container.textContent).toContain('Delta Y');
  });

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderScrollProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'scrollToElement' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('action', 'scrollToElement');
  });
});
