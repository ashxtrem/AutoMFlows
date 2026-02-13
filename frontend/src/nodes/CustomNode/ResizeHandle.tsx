import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ResizeHandleProps {
  onResize: (deltaX: number, deltaY: number) => void;
}

export function ResizeHandle({ onResize }: ResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent | PointerEvent) => {
      if (startPos.current) {
        const deltaX = e.clientX - startPos.current.x;
        const deltaY = e.clientY - startPos.current.y;
        onResize(deltaX, deltaY);
        startPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = (e?: MouseEvent | PointerEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      // Remove listeners immediately to prevent any further resize events
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('pointermove', handleMouseMove, true);
      document.removeEventListener('pointerup', handleMouseUp, true);
      setIsResizing(false);
      startPos.current = null;
    };

    // Use capture phase to ensure we catch events before ReactFlow
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('pointermove', handleMouseMove, true);
    document.addEventListener('pointerup', handleMouseUp, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('pointermove', handleMouseMove, true);
      document.removeEventListener('pointerup', handleMouseUp, true);
    };
  }, [isResizing, onResize]);

  return (
    <div
      data-nodrag
      className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 border-2 border-gray-800 rounded-tl-lg cursor-nwse-resize hover:bg-blue-400"
      onMouseDown={handleMouseDown}
      onPointerDown={handleMouseDown}
      style={{ zIndex: 10, pointerEvents: 'auto' }}
    />
  );
}
