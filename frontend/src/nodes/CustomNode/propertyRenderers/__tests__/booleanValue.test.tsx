import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderBooleanValueProperties } from '../booleanValue';

describe('renderBooleanValueProperties', () => {
  const mockHandlePropertyChange = vi.fn();

  const defaultProps = {
    renderData: {},
    handlePropertyChange: mockHandlePropertyChange,
    handleOpenPopup: vi.fn(),
    renderPropertyRow: vi.fn((name, element, index) => element),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default false value', () => {
    const result = renderBooleanValueProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
    expect(container.textContent).toContain('Value');
  });

  it('should render with true value', () => {
    const props = {
      ...defaultProps,
      renderData: { value: true },
    };
    const result = renderBooleanValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render with false value', () => {
    const props = {
      ...defaultProps,
      renderData: { value: false },
    };
    const result = renderBooleanValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should use false when value is null', () => {
    const props = {
      ...defaultProps,
      renderData: { value: null },
    };
    const result = renderBooleanValueProperties(props);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });
});
