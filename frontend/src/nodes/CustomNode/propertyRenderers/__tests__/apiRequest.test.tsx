import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderApiRequestProperties } from '../apiRequest';

describe('renderApiRequestProperties', () => {
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
    const result = renderApiRequestProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render method select', () => {
    const result = renderApiRequestProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Method');
  });

  it('should render url field', () => {
    const result = renderApiRequestProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('URL');
  });

  it('should render contextKey field', () => {
    const result = renderApiRequestProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Context Key');
  });

  it('should render timeout field', () => {
    const result = renderApiRequestProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Timeout');
  });
});
