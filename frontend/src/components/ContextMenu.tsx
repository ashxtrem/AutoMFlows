import { useEffect, useRef, useState } from 'react';
import { Copy, Trash2, Palette, SkipForward, ChevronRight, Settings } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  onClose: () => void;
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
  { name: 'Default', value: '#1f2937' },
];

export default function ContextMenu({ x, y, nodeId, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const { copyNode, pasteNode, deleteNode, toggleBypass, clipboard, setNodeColor, nodes, setSelectedNode } = useWorkflowStore();
  
  // Get current node background color if nodeId exists
  const currentNode = nodeId ? nodes.find(n => n.id === nodeId) : null;
  const currentBackgroundColor = currentNode?.data?.backgroundColor || '#1f2937';

  // Calculate adjusted position to keep menu within viewport
  const MENU_WIDTH = 180;
  const MENU_HEIGHT = nodeId ? 200 : 60; // Approximate height based on items
  const SUBMENU_WIDTH = 200;
  const [adjustedX, setAdjustedX] = useState(x);
  const [adjustedY, setAdjustedY] = useState(y);
  const [submenuOnRight, setSubmenuOnRight] = useState(true);

  useEffect(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let newX = x;
    let newY = y;
    
    // Check right edge (account for submenu if it might show)
    const totalWidth = MENU_WIDTH + SUBMENU_WIDTH + 10; // menu + submenu + gap
    if (x + totalWidth > viewportWidth) {
      // Try positioning menu to the left of cursor
      if (x - MENU_WIDTH >= 10) {
        newX = x - MENU_WIDTH;
        setSubmenuOnRight(false); // Submenu should appear on left side
      } else {
        // Not enough space on left, align to right edge
        newX = viewportWidth - totalWidth - 10;
        setSubmenuOnRight(true);
      }
    } else {
      setSubmenuOnRight(true);
    }
    
    // Check left edge
    if (newX < 10) {
      newX = 10;
    }
    
    // Check bottom edge
    if (y + MENU_HEIGHT > viewportHeight) {
      newY = viewportHeight - MENU_HEIGHT - 10;
    }
    
    // Check top edge
    if (newY < 10) {
      newY = 10;
    }
    
    setAdjustedX(newX);
    setAdjustedY(newY);
  }, [x, y, nodeId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCopy = () => {
    if (nodeId) {
      copyNode(nodeId);
    }
    onClose();
  };

  const handlePaste = () => {
    if (clipboard) {
      pasteNode({ x, y });
    }
    onClose();
  };

  const handleDelete = () => {
    if (nodeId) {
      deleteNode(nodeId);
    }
    onClose();
  };

  const handleBypass = () => {
    if (nodeId) {
      toggleBypass(nodeId);
    }
    onClose();
  };

  const handleColorSelect = (color: string) => {
    if (nodeId) {
      setNodeColor(nodeId, undefined, color);
    }
    setShowColorSubmenu(false);
    onClose();
  };

  const handleProperties = () => {
    if (nodeId) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
      }
    }
    onClose();
  };

  // Determine submenu position class
  const submenuPosition = submenuOnRight ? 'left-full' : 'right-full';

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[180px]"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onMouseLeave={() => setShowColorSubmenu(false)}
    >
      <div className="py-1">
        {nodeId ? (
          <>
            <button
              onClick={handleProperties}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <Settings size={16} />
              Properties
            </button>
            <div className="border-t border-gray-700 my-1" />
            <button
              onClick={handleCopy}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              onClick={handleBypass}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <SkipForward size={16} />
              Bypass
            </button>
            <div
              className="relative"
              onMouseEnter={() => setShowColorSubmenu(true)}
              onMouseLeave={() => setShowColorSubmenu(false)}
            >
              <button
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Palette size={16} />
                  Color
                </div>
                <ChevronRight size={14} />
              </button>
              {showColorSubmenu && (
                <div
                  className={`absolute ${submenuPosition} top-0 ${submenuOnRight ? 'ml-1' : 'mr-1'} bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2 min-w-[200px] max-h-[400px] overflow-y-auto`}
                >
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorSelect(color.value)}
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-3"
                    >
                      <div
                        className="w-5 h-5 rounded border border-gray-600"
                        style={{ backgroundColor: color.value }}
                      />
                      <span>{color.name}</span>
                      {currentBackgroundColor === color.value && (
                        <span className="ml-auto text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-700 my-1" />
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </>
        ) : (
          <>
            {clipboard && (
              <button
                onClick={handlePaste}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
              >
                <Copy size={16} />
                Paste
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

