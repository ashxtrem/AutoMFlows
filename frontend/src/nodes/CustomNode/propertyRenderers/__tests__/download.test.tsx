import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderDownloadProperties } from '../download';

describe('renderDownloadProperties', () => {
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
    const result = renderDownloadProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderDownloadProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render timeout field', () => {
    const result = renderDownloadProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Timeout');
  });
});
