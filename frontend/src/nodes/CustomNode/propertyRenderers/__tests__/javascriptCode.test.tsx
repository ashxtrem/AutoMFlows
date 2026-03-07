import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderJavascriptCodeProperties } from '../javascriptCode';

describe('renderJavascriptCodeProperties', () => {
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
    const result = renderJavascriptCodeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render code textarea', () => {
    const result = renderJavascriptCodeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Code');
  });

  it('should call handleOpenPopup when clicking code field', () => {
    const result = renderJavascriptCodeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    const clickableDiv = container.querySelector('.cursor-text')!;
    fireEvent.click(clickableDiv);
    expect(mockHandleOpenPopup).toHaveBeenCalled();
  });
});
