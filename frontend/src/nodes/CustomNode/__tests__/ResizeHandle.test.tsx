import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ResizeHandle } from '../ResizeHandle';

describe('ResizeHandle', () => {
  const mockOnResize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render resize handle', () => {
    const { container } = render(<ResizeHandle onResize={mockOnResize} />);
    const handle = container.querySelector('[data-nodrag]');
    expect(handle).toBeTruthy();
  });

  it('should call onResize when mouse moves during resize', () => {
    const { container } = render(<ResizeHandle onResize={mockOnResize} />);
    const handle = container.querySelector('[data-nodrag]') as HTMLElement;
    
    // Start resize
    fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });
    
    // Move mouse
    fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
    
    expect(mockOnResize).toHaveBeenCalled();
  });

  it('should stop resizing on mouse up', () => {
    const { container } = render(<ResizeHandle onResize={mockOnResize} />);
    const handle = container.querySelector('[data-nodrag]') as HTMLElement;
    
    // Start resize
    fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });
    
    // Stop resize
    fireEvent.mouseUp(document);
    
    // Move mouse after release - should not call onResize
    mockOnResize.mockClear();
    fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
    
    expect(mockOnResize).not.toHaveBeenCalled();
  });

  it('should handle pointer events', () => {
    const { container } = render(<ResizeHandle onResize={mockOnResize} />);
    const handle = container.querySelector('[data-nodrag]') as HTMLElement;
    
    // Start resize with pointer
    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100 });
    
    // Move pointer
    fireEvent.pointerMove(document, { clientX: 150, clientY: 150 });
    
    expect(mockOnResize).toHaveBeenCalled();
  });
});
