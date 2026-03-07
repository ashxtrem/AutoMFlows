import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderOpenBrowserProperties } from '../openBrowser';

describe('renderOpenBrowserProperties', () => {
  const mockHandlePropertyChange = vi.fn();
  const mockHandleOpenPopup = vi.fn();
  const mockRenderPropertyRow = vi.fn((name, element, index) => element);
  const mockSetShowCapabilitiesPopup = vi.fn();

  const defaultProps = {
    renderData: {},
    handlePropertyChange: mockHandlePropertyChange,
    handleOpenPopup: mockHandleOpenPopup,
    renderPropertyRow: mockRenderPropertyRow,
    setShowCapabilitiesPopup: mockSetShowCapabilitiesPopup,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default values', () => {
    const result = renderOpenBrowserProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render browser select', () => {
    const result = renderOpenBrowserProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Browser');
  });

  it('should render maxWindow checkbox', () => {
    const result = renderOpenBrowserProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Max Window');
  });

  it('should call handlePropertyChange when selecting browser', () => {
    const result = renderOpenBrowserProperties(defaultProps);
    const { container } = render(<>{result}</>);
    const selectDiv = container.querySelector('.cursor-pointer')!;
    fireEvent.click(selectDiv);
    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'firefox' } });
    expect(mockHandlePropertyChange).toHaveBeenCalledWith('browser', 'firefox');
  });
});
