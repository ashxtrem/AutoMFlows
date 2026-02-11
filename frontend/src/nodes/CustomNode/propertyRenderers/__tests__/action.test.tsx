import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderActionProperties } from '../action';

describe('renderActionProperties', () => {
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
    const result = renderActionProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render action select', () => {
    const result = renderActionProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Action');
  });

  it('should render selector type and selector fields', () => {
    const result = renderActionProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Selector Type');
    expect(container.textContent).toContain('Selector');
  });

  it('should render button select for click action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'click' },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Button');
  });

  it('should render delay input for hover action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'hover' },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Delay');
  });

  it('should render drag and drop fields for dragAndDrop action', () => {
    const props = {
      ...defaultProps,
      renderData: { action: 'dragAndDrop' },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Target Selector Type');
    expect(container.textContent).toContain('Target Selector');
  });

  it('should render waitForSelector fields when waitForSelector is set', () => {
    const props = {
      ...defaultProps,
      renderData: { waitForSelector: '.test' },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Wait Selector');
  });

  it('should render waitForUrl field when waitForUrl is set', () => {
    const props = {
      ...defaultProps,
      renderData: { waitForUrl: '/test' },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Wait URL');
  });

  it('should render waitForCondition field when waitForCondition is set', () => {
    const props = {
      ...defaultProps,
      renderData: { waitForCondition: '() => true' },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Wait Condition');
  });

  it('should render waitStrategy when wait conditions are set', () => {
    const props = {
      ...defaultProps,
      renderData: { waitForSelector: '.test' },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Wait Strategy');
  });

  it('should render retryStrategy when retryEnabled is true', () => {
    const props = {
      ...defaultProps,
      renderData: { retryEnabled: true },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Retry Strategy');
  });

  it('should render retryCount when retryStrategy is count', () => {
    const props = {
      ...defaultProps,
      renderData: { retryEnabled: true, retryStrategy: 'count' },
    };
    const result = renderActionProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Retry Count');
  });
});
