import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderApiCurlProperties } from '../apiCurl';

describe('renderApiCurlProperties', () => {
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
    const result = renderApiCurlProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render curlCommand textarea', () => {
    const result = renderApiCurlProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('cURL Command');
  });

  it('should render contextKey field', () => {
    const result = renderApiCurlProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Context Key');
  });

  it('should render timeout field', () => {
    const result = renderApiCurlProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Timeout');
  });
});
