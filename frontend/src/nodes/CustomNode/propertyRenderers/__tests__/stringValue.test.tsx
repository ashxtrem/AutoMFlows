import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderStringValueProperties } from '../stringValue';

describe('renderStringValueProperties', () => {
  const mockHandlePropertyChange = vi.fn();
  const mockHandleOpenPopup = vi.fn();

  const defaultProps = {
    renderData: {},
    handlePropertyChange: mockHandlePropertyChange,
    handleOpenPopup: mockHandleOpenPopup,
    renderPropertyRow: vi.fn((name, element, index) => element),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default empty value', () => {
    const result = renderStringValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
    expect(container.textContent).toContain('Value');
  });

  it('should render with existing value', () => {
    const props = {
      ...defaultProps,
      renderData: { value: 'test string' },
    };
    const result = renderStringValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should use empty string when value is null', () => {
    const props = {
      ...defaultProps,
      renderData: { value: null },
    };
    const result = renderStringValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });
});
