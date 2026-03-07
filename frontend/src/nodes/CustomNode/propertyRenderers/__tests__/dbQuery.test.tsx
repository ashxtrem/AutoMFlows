import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderDbQueryProperties } from '../dbQuery';

describe('renderDbQueryProperties', () => {
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
    const result = renderDbQueryProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container).toBeTruthy();
  });

  it('should render connectionKey field', () => {
    const result = renderDbQueryProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Connection Key');
  });

  it('should render queryType select', () => {
    const result = renderDbQueryProperties(defaultProps);
    const { container } = render(<>{result}</>);
    expect(container.textContent).toContain('Query Type');
  });

  it('should call handlePropertyChange when selecting query type', () => {
    const result = renderDbQueryProperties(defaultProps);
    const { container } = render(<>{result}</>);
    const selectDivs = container.querySelectorAll('.cursor-pointer');
    const queryTypeDiv = selectDivs[selectDivs.length - 1];
    fireEvent.click(queryTypeDiv);
    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'mongodb' } });
    expect(mockHandlePropertyChange).toHaveBeenCalledWith('queryType', 'mongodb');
  });
});
