import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWorkflowStore } from '../store/workflowStore';
import GroupMenuBar from './GroupMenuBar';
import GroupRenamePopup from './GroupRenamePopup';

// Define Group interface locally (matches shared/src/types.ts)
interface Group {
  id: string;
  name: string;
  nodeIds: string[];
  position: { x: number; y: number };
  width: number;
  height: number;
  borderColor?: string;
}

interface GroupBoundaryProps {
  group: Group;
}

const PRESET_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Default', value: '#4b5563' },
];

const DEFAULT_BORDER_COLOR = '#4b5563';

type ResizeHandleType = 'nw' | 'ne' | 'sw' | 'se';

export default function GroupBoundary({ group }: GroupBoundaryProps) {
  const { updateGroup, selectedGroupId, setSelectedGroupId, moveGroupNodes } = useWorkflowStore();
  const [showRenamePopup, setShowRenamePopup] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [viewportElement, setViewportElement] = useState<HTMLElement | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandleType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandleType | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number; width: number; height: number; groupX: number; groupY: number } | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const boundaryRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedGroupId === group.id;

  // Find the ReactFlow viewport element to render inside it
  useEffect(() => {
    const findViewport = () => {
      const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (viewport) {
        setViewportElement(viewport);
      } else {
        // Retry after a short delay if viewport not found yet
        setTimeout(findViewport, 100);
      }
    };
    findViewport();
  }, []);


  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Don't close if clicking inside the color picker
      if (colorPickerRef.current && colorPickerRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on the header that opened it (to allow reopening)
      if (headerRef.current && headerRef.current.contains(target)) {
        return;
      }
      
      // Close for any other click (canvas, nodes, etc.)
      setShowColorPicker(false);
    };

    if (showColorPicker) {
      // Use capture phase to catch events before they're stopped
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }
  }, [showColorPicker]);

  // Handle drag functionality
  useEffect(() => {
    if (!isDragging || !dragStartPos) return;

    // Capture initial group position when drag starts - use ref to avoid stale closure
    const initialGroupPosRef = { x: group.position.x, y: group.position.y };
    const initialScreenPos = { x: dragStartPos.x, y: dragStartPos.y };
    let lastAppliedOffset = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      // Get viewport to access zoom
      const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) return;

      const reactFlowInstance = (viewport as any).__rf;
      const zoom = reactFlowInstance?.viewport?.zoom || 1;

      // Calculate total delta from INITIAL position (not incremental)
      const deltaScreenX = e.clientX - initialScreenPos.x;
      const deltaScreenY = e.clientY - initialScreenPos.y;

      // Convert screen delta to flow delta (divide by zoom)
      const deltaFlowX = deltaScreenX / zoom;
      const deltaFlowY = deltaScreenY / zoom;

      // Calculate new group position from initial
      const newGroupX = initialGroupPosRef.x + deltaFlowX;
      const newGroupY = initialGroupPosRef.y + deltaFlowY;

      // Get current group position from store (not from stale prop)
      const currentGroup = useWorkflowStore.getState().groups.find(g => g.id === group.id);
      if (!currentGroup) return;

      // Calculate offset from current position
      const offsetX = newGroupX - currentGroup.position.x;
      const offsetY = newGroupY - currentGroup.position.y;

      // Move all nodes in the group by the offset (only if changed)
      if (Math.abs(offsetX - lastAppliedOffset.x) > 0.01 || Math.abs(offsetY - lastAppliedOffset.y) > 0.01) {
        moveGroupNodes(group.id, offsetX, offsetY);
        lastAppliedOffset = { x: offsetX, y: offsetY };
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStartPos(null);
      // Update group bounds after drag (only if not manually resized)
      const { updateGroupBounds, groups } = useWorkflowStore.getState();
      const currentGroup = groups.find(g => g.id === group.id);
      if (!currentGroup?.manuallyResized) {
        updateGroupBounds(group.id);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartPos, group.id]);

  // Handle resize functionality
  useEffect(() => {
    if (!isResizing || !resizeHandle || !resizeStartPos) return;

    // Capture initial values at resize start (don't depend on group state which may change)
    const initialGroupPos = { x: resizeStartPos.groupX, y: resizeStartPos.groupY };
    const initialGroupSize = { width: resizeStartPos.width, height: resizeStartPos.height };
    const initialScreenPos = { x: resizeStartPos.x, y: resizeStartPos.y };

    const handleMouseMove = (e: MouseEvent) => {
      // Get viewport to access zoom
      const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) return;

      const reactFlowInstance = (viewport as any).__rf;
      const zoom = reactFlowInstance?.viewport?.zoom || 1;

      // Calculate delta from INITIAL screen position (not incremental)
      const deltaScreenX = e.clientX - initialScreenPos.x;
      const deltaScreenY = e.clientY - initialScreenPos.y;

      // Convert screen delta to flow delta (divide by zoom)
      const deltaFlowX = deltaScreenX / zoom;
      const deltaFlowY = deltaScreenY / zoom;

      const MIN_SIZE = 50;
      let newX = initialGroupPos.x;
      let newY = initialGroupPos.y;
      let newWidth = initialGroupSize.width;
      let newHeight = initialGroupSize.height;

      switch (resizeHandle) {
        case 'nw': // Top-left - move top-left corner
          newX = initialGroupPos.x + deltaFlowX;
          newY = initialGroupPos.y + deltaFlowY;
          newWidth = Math.max(MIN_SIZE, initialGroupSize.width - deltaFlowX);
          newHeight = Math.max(MIN_SIZE, initialGroupSize.height - deltaFlowY);
          break;
        case 'ne': // Top-right - move top-right corner
          newY = initialGroupPos.y + deltaFlowY;
          newWidth = Math.max(MIN_SIZE, initialGroupSize.width + deltaFlowX);
          newHeight = Math.max(MIN_SIZE, initialGroupSize.height - deltaFlowY);
          break;
        case 'sw': // Bottom-left - move bottom-left corner
          newX = initialGroupPos.x + deltaFlowX;
          newWidth = Math.max(MIN_SIZE, initialGroupSize.width - deltaFlowX);
          newHeight = Math.max(MIN_SIZE, initialGroupSize.height + deltaFlowY);
          break;
        case 'se': // Bottom-right - move bottom-right corner
          newWidth = Math.max(MIN_SIZE, initialGroupSize.width + deltaFlowX);
          newHeight = Math.max(MIN_SIZE, initialGroupSize.height + deltaFlowY);
          break;
      }

      updateGroup(group.id, {
        position: { x: newX, y: newY },
        width: newWidth,
        height: newHeight,
        manuallyResized: true, // Mark as manually resized
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStartPos(null);
      // Don't recalculate bounds after manual resize - user explicitly set the size
      // updateGroupBounds would overwrite the manual resize with node-based calculation
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, resizeStartPos, group.id, group.position, group.width, group.height]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRenamePopup(true);
  };

  const handleRenameSave = (newName: string) => {
    updateGroup(group.id, { name: newName });
    setShowRenamePopup(false);
  };

  const handleRenameCancel = () => {
    setShowRenamePopup(false);
  };

  const handleHeaderRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowColorPicker(true);
  };

  const handleColorSelect = (color: string) => {
    updateGroup(group.id, { borderColor: color });
    setShowColorPicker(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handleType: ResizeHandleType) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handleType);
    setResizeStartPos({
      x: e.clientX,
      y: e.clientY,
      width: group.width,
      height: group.height,
      groupX: group.position.x,
      groupY: group.position.y,
    });
  };

  const borderColor = group.borderColor || DEFAULT_BORDER_COLOR;

  const boundaryContent = (
    <div
      ref={boundaryRef}
      className="react-flow__group-boundary"
      style={{
        position: 'absolute',
        left: `${group.position.x}px`,
        top: `${group.position.y}px`,
        width: `${group.width}px`,
        height: `${group.height}px`,
        border: `2px dashed ${borderColor}`,
        backgroundColor: 'transparent',
        borderRadius: '4px',
        zIndex: 1,
        // Set to none so nodes can be clicked - only interactive elements have pointer events
        pointerEvents: 'none',
      }}
    >
      {/* Hover detection - use multiple divs for edges to avoid covering corner handles */}
      {/* Top edge - excludes corners (handles are 16px at -8px offset, so leave 20px gap) */}
      <div
        style={{
          position: 'absolute',
          left: '20px',
          top: '-4px',
          right: '20px',
          height: '4px',
          pointerEvents: 'auto',
          zIndex: 0,
        }}
      />
      {/* Bottom edge - excludes corners */}
      <div
        style={{
          position: 'absolute',
          left: '20px',
          bottom: '-4px',
          right: '20px',
          height: '4px',
          pointerEvents: 'auto',
          zIndex: 0,
        }}
      />
      {/* Left edge - excludes corners */}
      <div
        style={{
          position: 'absolute',
          left: '-4px',
          top: '20px',
          bottom: '20px',
          width: '4px',
          pointerEvents: 'auto',
          zIndex: 0,
        }}
      />
      {/* Right edge - excludes corners */}
      <div
        style={{
          position: 'absolute',
          right: '-4px',
          top: '20px',
          bottom: '20px',
          width: '4px',
          pointerEvents: 'auto',
          zIndex: 0,
        }}
      />
        {/* Header - positioned outside boundary to avoid overlapping nodes */}
        <div
          ref={headerRef}
          className="group-header absolute pointer-events-auto"
          style={{
            left: '-2px',
            top: '-24px',
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            padding: '4px 8px',
            borderRadius: '4px 4px 0 0',
            border: `2px dashed ${borderColor}`,
            borderBottom: 'none',
            zIndex: 10,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleHeaderRightClick}
          onMouseDown={(e) => {
            // Allow header drag - start drag on mousedown
            if (!showRenamePopup) {
              e.stopPropagation();
              e.preventDefault();
              setIsDragging(true);
              setDragStartPos({ x: e.clientX, y: e.clientY });
            }
          }}
          onClick={(e) => {
            if (!showRenamePopup) {
              e.stopPropagation();
              setSelectedGroupId(group.id);
            }
          }}
        >
          <div
            className="text-sm font-medium text-gray-300 cursor-text select-none"
            style={{ pointerEvents: 'auto' }}
            title="Double-click to rename, right-click to change color"
          >
            {group.name}
          </div>
        </div>

        {/* Color picker */}
        {showColorPicker && (
          <div
            ref={colorPickerRef}
            className="absolute bg-gray-800 border border-gray-700 rounded shadow-lg p-2 z-50"
            style={{
              left: '0px',
              top: '24px',
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorSelect(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

    </div>
  );

  // Render resize handles separately to ensure they're on top - always visible
  const resizeHandlesContent = (
    <>
      {/* Top-left */}
      <div
        className="resize-handle"
        style={{
          position: 'absolute',
          left: `${group.position.x - 8}px`,
          top: `${group.position.y - 8}px`,
          width: '16px',
          height: '16px',
          backgroundColor: hoveredHandle === 'nw' ? 'rgba(17, 24, 39, 0.9)' : 'transparent',
          border: `2px solid ${hoveredHandle === 'nw' ? 'rgba(17, 24, 39, 0.9)' : 'rgba(17, 24, 39, 0.3)'}`,
          borderRadius: '4px',
          cursor: 'nw-resize',
          zIndex: 1000,
          opacity: hoveredHandle === 'nw' ? 1 : 0.4,
          transition: 'background-color 0.15s, border-color 0.15s, transform 0.15s, opacity 0.15s',
          pointerEvents: 'auto',
          transform: hoveredHandle === 'nw' ? 'scale(1.2)' : 'scale(1)',
          boxShadow: hoveredHandle === 'nw' ? '0 0 4px rgba(17, 24, 39, 0.5)' : 'none',
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setHoveredHandle('nw');
        }}
        onMouseLeave={(e) => {
          setHoveredHandle(null);
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleResizeMouseDown(e, 'nw');
        }}
      />
      {/* Top-right */}
      <div
        className="resize-handle"
        style={{
          position: 'absolute',
          left: `${group.position.x + group.width - 8}px`,
          top: `${group.position.y - 8}px`,
          width: '16px',
          height: '16px',
          backgroundColor: hoveredHandle === 'ne' ? 'rgba(17, 24, 39, 0.9)' : 'transparent',
          border: `2px solid ${hoveredHandle === 'ne' ? 'rgba(17, 24, 39, 0.9)' : 'rgba(17, 24, 39, 0.3)'}`,
          borderRadius: '4px',
          cursor: 'ne-resize',
          zIndex: 1000,
          opacity: hoveredHandle === 'ne' ? 1 : 0.4,
          transition: 'background-color 0.15s, border-color 0.15s, transform 0.15s, opacity 0.15s',
          pointerEvents: 'auto',
          transform: hoveredHandle === 'ne' ? 'scale(1.2)' : 'scale(1)',
          boxShadow: hoveredHandle === 'ne' ? '0 0 4px rgba(17, 24, 39, 0.5)' : 'none',
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setHoveredHandle('ne');
        }}
        onMouseLeave={(e) => {
          setHoveredHandle(null);
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleResizeMouseDown(e, 'ne');
        }}
      />
      {/* Bottom-left */}
      <div
        className="resize-handle"
        style={{
          position: 'absolute',
          left: `${group.position.x - 8}px`,
          top: `${group.position.y + group.height - 8}px`,
          width: '16px',
          height: '16px',
          backgroundColor: hoveredHandle === 'sw' ? 'rgba(17, 24, 39, 0.9)' : 'transparent',
          border: `2px solid ${hoveredHandle === 'sw' ? 'rgba(17, 24, 39, 0.9)' : 'rgba(17, 24, 39, 0.3)'}`,
          borderRadius: '4px',
          cursor: 'sw-resize',
          zIndex: 1000,
          opacity: hoveredHandle === 'sw' ? 1 : 0.4,
          transition: 'background-color 0.15s, border-color 0.15s, transform 0.15s, opacity 0.15s',
          pointerEvents: 'auto',
          transform: hoveredHandle === 'sw' ? 'scale(1.2)' : 'scale(1)',
          boxShadow: hoveredHandle === 'sw' ? '0 0 4px rgba(17, 24, 39, 0.5)' : 'none',
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setHoveredHandle('sw');
        }}
        onMouseLeave={(e) => {
          setHoveredHandle(null);
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleResizeMouseDown(e, 'sw');
        }}
      />
      {/* Bottom-right */}
      <div
        className="resize-handle"
        style={{
          position: 'absolute',
          left: `${group.position.x + group.width - 8}px`,
          top: `${group.position.y + group.height - 8}px`,
          width: '16px',
          height: '16px',
          backgroundColor: hoveredHandle === 'se' ? 'rgba(17, 24, 39, 0.9)' : 'transparent',
          border: `2px solid ${hoveredHandle === 'se' ? 'rgba(17, 24, 39, 0.9)' : 'rgba(17, 24, 39, 0.3)'}`,
          borderRadius: '4px',
          cursor: 'se-resize',
          zIndex: 1000,
          opacity: hoveredHandle === 'se' ? 1 : 0.4,
          transition: 'background-color 0.15s, border-color 0.15s, transform 0.15s, opacity 0.15s',
          pointerEvents: 'auto',
          transform: hoveredHandle === 'se' ? 'scale(1.2)' : 'scale(1)',
          boxShadow: hoveredHandle === 'se' ? '0 0 4px rgba(17, 24, 39, 0.5)' : 'none',
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setHoveredHandle('se');
        }}
        onMouseLeave={(e) => {
          setHoveredHandle(null);
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleResizeMouseDown(e, 'se');
        }}
      />
    </>
  );

  // Render inside viewport if found, otherwise render normally (fallback)
  return (
    <>
      {viewportElement ? createPortal(boundaryContent, viewportElement) : boundaryContent}
      {viewportElement ? createPortal(resizeHandlesContent, viewportElement) : resizeHandlesContent}
      {/* Group menu bar - show when group is selected */}
      {isSelected && (
        <GroupMenuBar groupId={group.id} />
      )}
      {/* Rename popup */}
      {showRenamePopup && (
        <GroupRenamePopup
          currentName={group.name}
          onSave={handleRenameSave}
          onClose={handleRenameCancel}
        />
      )}
    </>
  );
}
