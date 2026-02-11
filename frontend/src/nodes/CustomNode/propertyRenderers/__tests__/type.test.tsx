import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderTypeProperties } from '../type';

describe('renderTypeProperties', () => {
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
    const result = renderTypeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render selector type and selector fields', () => {
    const result = renderTypeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Selector Type');
    expect(container.textContent).toContain('Selector');
  });

  it('should render inputMethod select', () => {
    const result = renderTypeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Input Method');
  });

  it('should render text field', () => {
    const result = renderTypeProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Text');
  });
});
