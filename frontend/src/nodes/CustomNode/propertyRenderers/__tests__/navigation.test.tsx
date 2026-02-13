import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderNavigationProperties } from '../navigation';

describe('renderNavigationProperties', () => {
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
    const result = renderNavigationProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderNavigationProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render url field for navigate action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'navigate' },
    };
    const result = renderNavigationProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('URL');
  });

  it('should render referer field for navigate action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'navigate' },
    };
    const result = renderNavigationProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Referer');
  });

  it('should render waitUntil for navigate action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'navigate' },
    };
    const result = renderNavigationProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Wait Until');
  });

  it('should render tabIndex for switchTab action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'switchTab' },
    };
    const result = renderNavigationProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Tab Index');
  });
});
