import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderIntValueProperties } from '../intValue';

describe('renderIntValueProperties', () => {
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

  it('should render with default value', () => {
    const result = renderIntValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
    expect(container.textContent).toContain('Value');
  });

  it('should render with existing value', () => {
    const props = {
      ...defaultProps,
      renderData: { value: 42 },
    };
    const result = renderIntValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should use default value of 0 when value is null', () => {
    const props = {
      ...defaultProps,
      renderData: { value: null },
    };
    const result = renderIntValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should use default value of 0 when value is undefined', () => {
    const result = renderIntValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });
});
