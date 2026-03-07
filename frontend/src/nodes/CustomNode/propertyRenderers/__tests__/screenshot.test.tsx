import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderScreenshotProperties } from '../screenshot';

describe('renderScreenshotProperties', () => {
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
    const result = renderScreenshotProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderScreenshotProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render selector field for element action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'element' },
    };
    const result = renderScreenshotProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Selector');
  });

  it('should call handlePropertyChange when selecting a value', () => {
    const result = renderScreenshotProperties(defaultProps);
    const { container } = render(<>{result}</>);

    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'element' } });

    expect(mockHandlePropertyChange).toHaveBeenCalledWith('action', 'element');
  });
});
