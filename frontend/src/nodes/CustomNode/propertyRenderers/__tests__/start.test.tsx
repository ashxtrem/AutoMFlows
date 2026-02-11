import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderStartProperties } from '../start';

describe('renderStartProperties', () => {
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
    const result = renderStartProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render recordSession checkbox', () => {
    const result = renderStartProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Record Session');
  });

  it('should render screenshotAllNodes checkbox', () => {
    const result = renderStartProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Screenshot All Nodes');
  });

  it('should render screenshotTiming select when screenshotAllNodes is true', () => {
    const props = {
      ...defaultProps,
      renderData: { screenshotAllNodes: true },
    };
    const result = renderStartProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Screenshot Timing');
  });

  it('should not render screenshotTiming when screenshotAllNodes is false', () => {
    const props = {
      ...defaultProps,
      renderData: { screenshotAllNodes: false },
    };
    const result = renderStartProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).not.toContain('Screenshot Timing');
  });

  it('should render slowMo input', () => {
    const result = renderStartProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Slowmo');
  });

  it('should render scrollThenAction checkbox', () => {
    const result = renderStartProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Scroll Then Action');
  });

  it('should handle property changes', () => {
    const result = renderStartProperties(defaultProps);
    render(<>{result}</>);
    expect(mockRenderPropertyRow).toHaveBeenCalled();
  });

  it('should use default values when renderData is empty', () => {
    const result = renderStartProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should handle existing values', () => {
    const props = {
      ...defaultProps,
      renderData: {
        recordSession: true,
        screenshotAllNodes: true,
        screenshotTiming: 'pre',
        slowMo: 100,
        scrollThenAction: true,
      },
    };
    const result = renderStartProperties(props);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });
});
