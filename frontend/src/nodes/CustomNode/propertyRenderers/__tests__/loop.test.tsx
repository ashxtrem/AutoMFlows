import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { renderLoopProperties } from '../loop';

describe('renderLoopProperties', () => {
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
    const result = renderLoopProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render mode selector', () => {
    const props = {
      ...defaultProps,
      renderData: {
        mode: 'forEach',
      },
    };
    const result = renderLoopProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Mode');
  });

  it('should render forEach mode with arrayVariable field', () => {
    const props = {
      ...defaultProps,
      renderData: {
        mode: 'forEach',
        arrayVariable: 'items',
      },
    };
    const result = renderLoopProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Array Var');
  });

  it('should render doWhile mode with condition summary', () => {
    const props = {
      ...defaultProps,
      renderData: {
        mode: 'doWhile',
        condition: {
          type: 'javascript',
          javascriptExpression: 'context.getVariable("counter") < 10',
        },
        maxIterations: 100,
      },
    };
    const result = renderLoopProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Do While');
    expect(container.textContent).toContain('JS:');
    expect(container.textContent).toContain('100');
  });

  it('should render doWhile mode with updateStep indicator', () => {
    const props = {
      ...defaultProps,
      renderData: {
        mode: 'doWhile',
        condition: {
          type: 'variable',
          variableName: 'counter',
        },
        updateStep: 'context.setVariable("counter", counter + 1)',
      },
    };
    const result = renderLoopProperties(props);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Has update step');
  });

  it('should render different condition types correctly', () => {
    const conditionTypes = [
      { type: 'ui-element', selector: '#button', expected: 'UI:' },
      { type: 'api-status', statusCode: 200, expected: 'API:' },
      { type: 'api-json-path', jsonPath: 'data.id', expected: 'JSON:' },
      { type: 'variable', variableName: 'counter', expected: 'Var:' },
    ];

    conditionTypes.forEach((condition) => {
      const props = {
        ...defaultProps,
        renderData: {
          mode: 'doWhile',
          condition,
        },
      };
      const result = renderLoopProperties(props);
      const { container } = render(<>{result}</>);
      expect(container.textContent).toContain(condition.expected);
    });
  });
});
