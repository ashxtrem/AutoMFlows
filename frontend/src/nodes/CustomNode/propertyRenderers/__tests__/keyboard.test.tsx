import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderKeyboardProperties } from '../keyboard';

describe('renderKeyboardProperties', () => {
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
    const result = renderKeyboardProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderKeyboardProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render key field for press action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'press' },
    };
    const result = renderKeyboardProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Key');
  });

  it('should render text field for type action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'type' },
    };
    const result = renderKeyboardProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Text');
  });

  it('should render shortcut field for shortcut action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'shortcut' },
    };
    const result = renderKeyboardProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Shortcut');
  });
});
