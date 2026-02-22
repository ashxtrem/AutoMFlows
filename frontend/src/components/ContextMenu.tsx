import { useEffect, useRef, useState } from 'react';
import { Copy, Trash2, Palette, SkipForward, ChevronRight, Settings, Plug, RotateCw, Plus, LayoutGrid, FolderPlus, Save, Package } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { useSettingsStore } from '../store/settingsStore';
import { getNodeProperties, isPropertyInputConnection } from '../utils/nodeProperties';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  flowPosition?: { x: number; y: number };
  screenPosition?: { x: number; y: number };
  onClose: () => void;
  onAddNode?: () => void;
  onSaveAsSubNode?: (nodeIds: string[]) => void;
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

export default function ContextMenu({ x, y, nodeId, flowPosition, screenPosition: _screenPosition, onClose, onAddNode, onSaveAsSubNode }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const colorSubmenuRef = useRef<HTMLDivElement>(null);
  const convertInputSubmenuRef = useRef<HTMLDivElement>(null);
  const arrangeSubmenuRef = useRef<HTMLDivElement>(null);
  const subNodesSubmenuRef = useRef<HTMLDivElement>(null);
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const [showConvertInputSubmenu, setShowConvertInputSubmenu] = useState(false);
  const [showArrangeSubmenu, setShowArrangeSubmenu] = useState(false);
  const [showSubNodesSubmenu, setShowSubNodesSubmenu] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { copyNode, pasteNode, deleteNode, toggleBypass, clipboard, setNodeColor, nodes, setSelectedNode, convertPropertyToInput, convertInputToProperty, reloadNode, selectedNodeIds, arrangeSelectedNodes, createGroup, subNodeSnippets, insertSubNode, deleteSubNode } = useWorkflowStore();
  const { canvas } = useSettingsStore();
  
  // Check if multiple nodes are selected (need 2+ for arrange)
  const hasMultipleSelection = selectedNodeIds.size >= 2;
  
  // Get current node background color if nodeId exists
  const currentNode = nodeId ? nodes.find(n => n.id === nodeId) : null;
  const currentBackgroundColor = currentNode?.data?.backgroundColor || '#1f2937';

  // Calculate adjusted position to keep menu within viewport
  const MENU_WIDTH = 180;
  const MENU_HEIGHT = nodeId ? 380 : 120; // Approximate height based on items (increased for submenus)
  const SUBMENU_WIDTH = 200;
  const [adjustedX, setAdjustedX] = useState(x);
  const [adjustedY, setAdjustedY] = useState(y);
  const [submenuOnRight, setSubmenuOnRight] = useState(true);
  const [submenuY, setSubmenuY] = useState(0);

  useEffect(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let newX = x;
    let newY = y;
    
    // Check right edge (account for submenu if it might show)
    const totalWidth = MENU_WIDTH + SUBMENU_WIDTH; // menu + submenu (no gap)
    if (x + totalWidth > viewportWidth) {
      // Try positioning menu to the left of cursor
      if (x - MENU_WIDTH >= 10) {
        newX = x - MENU_WIDTH;
        setSubmenuOnRight(false); // Submenu should appear on left side
      } else {
        // Not enough space on left, align to right edge
        newX = Math.max(10, viewportWidth - totalWidth - 10);
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
      newY = Math.max(10, viewportHeight - MENU_HEIGHT - 10);
    }
    
    // Check top edge
    if (newY < 10) {
      newY = 10;
    }
    
    setAdjustedX(newX);
    setAdjustedY(newY);
    setSubmenuY(0); // Reset submenu Y offset
  }, [x, y, nodeId]);

  // Calculate submenu position when it opens (use requestAnimationFrame to ensure DOM is updated)
  useEffect(() => {
    if (showColorSubmenu && colorSubmenuRef.current) {
      requestAnimationFrame(() => {
        if (colorSubmenuRef.current) {
          const rect = colorSubmenuRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          let offsetY = 0;
          
          // Check if submenu goes below viewport
          if (rect.bottom > viewportHeight) {
            offsetY = viewportHeight - rect.bottom - 10;
          }
          
          // Check if submenu goes above viewport
          if (rect.top < 0) {
            offsetY = -rect.top + 10;
          }
          
          // Also check if submenu goes off right/left edge
          if (submenuOnRight && rect.right > viewportWidth) {
            // Switch to left side if needed
            setSubmenuOnRight(false);
          } else if (!submenuOnRight && rect.left < 0) {
            // Switch to right side if needed
            setSubmenuOnRight(true);
          }
          
          setSubmenuY(offsetY);
        }
      });
    }
  }, [showColorSubmenu, submenuOnRight]);

  useEffect(() => {
    if (showConvertInputSubmenu && convertInputSubmenuRef.current) {
      requestAnimationFrame(() => {
        if (convertInputSubmenuRef.current) {
          const rect = convertInputSubmenuRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          let offsetY = 0;
          
          // Check if submenu goes below viewport
          if (rect.bottom > viewportHeight) {
            offsetY = viewportHeight - rect.bottom - 10;
          }
          
          // Check if submenu goes above viewport
          if (rect.top < 0) {
            offsetY = -rect.top + 10;
          }
          
          // Also check if submenu goes off right/left edge
          if (submenuOnRight && rect.right > viewportWidth) {
            // Switch to left side if needed
            setSubmenuOnRight(false);
          } else if (!submenuOnRight && rect.left < 0) {
            // Switch to right side if needed
            setSubmenuOnRight(true);
          }
          
          setSubmenuY(offsetY);
        }
      });
    }
  }, [showConvertInputSubmenu, submenuOnRight]);

  useEffect(() => {
    if (showArrangeSubmenu && arrangeSubmenuRef.current) {
      requestAnimationFrame(() => {
        if (arrangeSubmenuRef.current) {
          const rect = arrangeSubmenuRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          let offsetY = 0;
          
          // Check if submenu goes below viewport
          if (rect.bottom > viewportHeight) {
            offsetY = viewportHeight - rect.bottom - 10;
          }
          
          // Check if submenu goes above viewport
          if (rect.top < 0) {
            offsetY = -rect.top + 10;
          }
          
          // Also check if submenu goes off right/left edge
          if (submenuOnRight && rect.right > viewportWidth) {
            // Switch to left side if needed
            setSubmenuOnRight(false);
          } else if (!submenuOnRight && rect.left < 0) {
            // Switch to right side if needed
            setSubmenuOnRight(true);
          }
          
          setSubmenuY(offsetY);
        }
      });
    }
  }, [showArrangeSubmenu, submenuOnRight]);

  useEffect(() => {
    if (showSubNodesSubmenu && subNodesSubmenuRef.current) {
      requestAnimationFrame(() => {
        if (subNodesSubmenuRef.current) {
          const rect = subNodesSubmenuRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          let offsetY = 0;
          
          if (rect.bottom > viewportHeight) {
            offsetY = viewportHeight - rect.bottom - 10;
          }
          
          if (rect.top < 0) {
            offsetY = -rect.top + 10;
          }
          
          if (submenuOnRight && rect.right > viewportWidth) {
            setSubmenuOnRight(false);
          } else if (!submenuOnRight && rect.left < 0) {
            setSubmenuOnRight(true);
          }
          
          setSubmenuY(offsetY);
        }
      });
    }
  }, [showSubNodesSubmenu, submenuOnRight]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Use a small delay to allow button clicks to process first
      setTimeout(() => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      }, 0);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use 'click' instead of 'mousedown' to allow button clicks to process first
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCopy = () => {
    // If multiple nodes are selected, copy all of them; otherwise copy the single node
    if (selectedNodeIds.size > 1 && selectedNodeIds.has(nodeId || '')) {
      // Multiple nodes selected: copy all selected nodes
      copyNode(Array.from(selectedNodeIds));
    } else if (nodeId) {
      // Single node: copy just this node
      copyNode(nodeId);
    }
    onClose();
  };

  const handlePaste = async () => {
    const position = flowPosition || { x, y };
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (parsed && parsed._automflows === true && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
        useWorkflowStore.getState().pasteFromClipboardData(parsed, position);
        onClose();
        return;
      }
    } catch {
      // System clipboard unavailable or content is not ours — fall back
    }
    if (clipboard) {
      pasteNode(position);
    }
    onClose();
  };

  const handleAddNode = () => {
    if (onAddNode) {
      onAddNode();
    }
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

  const handleProperties = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (nodeId) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        console.log('[ContextMenu] Opening properties for node:', node.id, node.data.type);
        setSelectedNode(node);
      } else {
        console.warn('[ContextMenu] Node not found:', nodeId);
      }
    }
    // Delay closing to ensure state update completes
    setTimeout(() => {
      onClose();
    }, 10);
  };

  const handlePropertyConversion = (propertyName: string) => {
    if (!nodeId) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const isInput = isPropertyInputConnection(node.data, propertyName);
    if (isInput) {
      convertInputToProperty(nodeId, propertyName);
    } else {
      convertPropertyToInput(nodeId, propertyName);
    }
    setShowConvertInputSubmenu(false);
    onClose();
  };

  const handleReload = () => {
    if (nodeId) {
      reloadNode(nodeId);
    }
    onClose();
  };

  const handleArrange = (mode: 'horizontal' | 'vertical') => {
    if (hasMultipleSelection) {
      arrangeSelectedNodes(mode, canvas.nodesPerRowColumn);
    }
    setShowArrangeSubmenu(false);
    onClose();
  };

  const handleCreateGroup = () => {
    if (hasMultipleSelection) {
      const nodeIds = Array.from(selectedNodeIds);
      createGroup(nodeIds);
    }
    onClose();
  };

  const handleSaveAsSubNode = () => {
    let nodeIds: string[];
    if (selectedNodeIds.size > 1 && selectedNodeIds.has(nodeId || '')) {
      nodeIds = Array.from(selectedNodeIds);
    } else if (nodeId) {
      nodeIds = [nodeId];
    } else {
      return;
    }
    onClose();
    onSaveAsSubNode?.(nodeIds);
  };

  const handleInsertSubNode = (snippetId: string) => {
    const position = flowPosition || { x, y };
    insertSubNode(snippetId, position);
    onClose();
  };

  const handleDeleteSubNode = (e: React.MouseEvent, snippetId: string) => {
    e.stopPropagation();
    if (deleteConfirmId === snippetId) {
      deleteSubNode(snippetId);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(snippetId);
    }
  };

  // Get available properties for the node
  const availableProperties = nodeId ? (() => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];
    return getNodeProperties(node.data.type);
  })() : [];

  // Submenu positioning will be handled via inline styles

  return (
    <div
      ref={menuRef}
      className="fixed bg-surface border border-border rounded-lg shadow-xl z-50 min-w-[180px]"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onMouseLeave={(e) => {
        // Only close submenus if mouse is not moving to submenu
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || (!menuRef.current?.contains(relatedTarget) && 
            !colorSubmenuRef.current?.contains(relatedTarget) && 
            !convertInputSubmenuRef.current?.contains(relatedTarget) &&
            !arrangeSubmenuRef.current?.contains(relatedTarget) &&
            !subNodesSubmenuRef.current?.contains(relatedTarget))) {
          setShowColorSubmenu(false);
          setShowConvertInputSubmenu(false);
          setShowArrangeSubmenu(false);
          setShowSubNodesSubmenu(false);
        }
      }}
    >
      <div className="py-1">
        {nodeId ? (
          <>
            <button
              onClick={handleProperties}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
            >
              <Settings size={16} />
              Properties
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleCopy}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              onClick={handleBypass}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
            >
              <SkipForward size={16} />
              Bypass
            </button>
            <button
              onClick={handleReload}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
            >
              <RotateCw size={16} />
              Reload Node
            </button>
            {availableProperties.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setShowConvertInputSubmenu(true)}
                onMouseLeave={(e) => {
                  // Only close if mouse is not moving to submenu
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (!relatedTarget || !convertInputSubmenuRef.current?.contains(relatedTarget)) {
                    setShowConvertInputSubmenu(false);
                  }
                }}
              >
                <button
                  className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Plug size={16} />
                    Convert to Input
                  </div>
                  <ChevronRight size={14} />
                </button>
                {showConvertInputSubmenu && (
                  <div
                    ref={convertInputSubmenuRef}
                    className="absolute top-0 bg-surface border border-border rounded-lg shadow-xl z-50 py-2 min-w-[200px] max-h-[400px] overflow-y-auto"
                    style={{ 
                      [submenuOnRight ? 'left' : 'right']: '100%',
                      transform: submenuY !== 0 ? `translateY(${submenuY}px)` : undefined
                    }}
                    onMouseEnter={() => setShowConvertInputSubmenu(true)}
                    onMouseLeave={() => setShowConvertInputSubmenu(false)}
                  >
                    {availableProperties.map((prop) => {
                      const node = nodes.find(n => n.id === nodeId);
                      const isInput = node ? isPropertyInputConnection(node.data, prop.name) : false;
                      return (
                        <button
                          key={prop.name}
                          onClick={() => handlePropertyConversion(prop.name)}
                          className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-3"
                        >
                          <span>{prop.label}</span>
                          {isInput && (
                            <span className="ml-auto text-xs">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div
              className="relative"
              onMouseEnter={() => setShowColorSubmenu(true)}
              onMouseLeave={(e) => {
                // Only close if mouse is not moving to submenu
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget || !colorSubmenuRef.current?.contains(relatedTarget)) {
                  setShowColorSubmenu(false);
                }
              }}
            >
              <button
                className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Palette size={16} />
                  Color
                </div>
                <ChevronRight size={14} />
              </button>
              {showColorSubmenu && (
                <div
                  ref={colorSubmenuRef}
                  className="absolute top-0 bg-surface border border-border rounded-lg shadow-xl z-50 py-2 min-w-[200px] max-h-[400px] overflow-y-auto"
                  style={{ 
                    [submenuOnRight ? 'left' : 'right']: '100%',
                    transform: submenuY !== 0 ? `translateY(${submenuY}px)` : undefined
                  }}
                  onMouseEnter={() => setShowColorSubmenu(true)}
                  onMouseLeave={() => setShowColorSubmenu(false)}
                >
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorSelect(color.value)}
                      className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-3"
                    >
                      <div
                        className="w-5 h-5 rounded border border-border"
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
            {hasMultipleSelection && (
              <>
                <button
                  onClick={handleCreateGroup}
                  className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
                >
                  <FolderPlus size={16} />
                  Group
                </button>
                <div
                  className="relative"
                  onMouseEnter={() => setShowArrangeSubmenu(true)}
                  onMouseLeave={(e) => {
                    // Only close if mouse is not moving to submenu
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (!relatedTarget || !arrangeSubmenuRef.current?.contains(relatedTarget)) {
                      setShowArrangeSubmenu(false);
                    }
                  }}
                >
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={16} />
                      Arrange
                    </div>
                    <ChevronRight size={14} />
                  </button>
                  {showArrangeSubmenu && (
                    <div
                      ref={arrangeSubmenuRef}
                      className="absolute top-0 bg-surface border border-border rounded-lg shadow-xl z-50 py-2 min-w-[200px]"
                      style={{ 
                        [submenuOnRight ? 'left' : 'right']: '100%',
                        transform: submenuY !== 0 ? `translateY(${submenuY}px)` : undefined
                      }}
                      onMouseEnter={() => setShowArrangeSubmenu(true)}
                      onMouseLeave={() => setShowArrangeSubmenu(false)}
                    >
                      <button
                        onClick={() => handleArrange('horizontal')}
                        className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
                      >
                        Horizontal
                      </button>
                      <button
                        onClick={() => handleArrange('vertical')}
                        className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
                      >
                        Vertical
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="border-t border-border my-1" />
            <button
              onClick={handleSaveAsSubNode}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
            >
              <Save size={16} />
              Save as Sub Node
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-surfaceHighlight flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleAddNode}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
            >
              <Plus size={16} />
              Add Node
            </button>
            <button
              onClick={handlePaste}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center gap-2"
            >
              <Copy size={16} />
              Paste
            </button>
            <div
              className="relative"
              onMouseEnter={() => setShowSubNodesSubmenu(true)}
              onMouseLeave={(e) => {
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget || !subNodesSubmenuRef.current?.contains(relatedTarget)) {
                  setShowSubNodesSubmenu(false);
                  setDeleteConfirmId(null);
                }
              }}
            >
              <button
                className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surfaceHighlight flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Package size={16} />
                  Insert Sub Nodes
                </div>
                <ChevronRight size={14} />
              </button>
              {showSubNodesSubmenu && (
                <div
                  ref={subNodesSubmenuRef}
                  className="absolute top-0 bg-surface border border-border rounded-lg shadow-xl z-50 py-2 min-w-[200px] max-h-[400px] overflow-y-auto"
                  style={{
                    [submenuOnRight ? 'left' : 'right']: '100%',
                    transform: submenuY !== 0 ? `translateY(${submenuY}px)` : undefined
                  }}
                  onMouseEnter={() => setShowSubNodesSubmenu(true)}
                  onMouseLeave={() => {
                    setShowSubNodesSubmenu(false);
                    setDeleteConfirmId(null);
                  }}
                >
                  {subNodeSnippets.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No saved sub nodes
                    </div>
                  ) : (
                    subNodeSnippets.map((snippet) => (
                      <div
                        key={snippet.id}
                        className="flex items-center hover:bg-surfaceHighlight group"
                      >
                        <button
                          onClick={() => handleInsertSubNode(snippet.id)}
                          className="flex-1 px-4 py-2 text-left text-sm text-primary flex items-center gap-2 min-w-0"
                        >
                          <span className="truncate">{snippet.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            ({snippet.nodes.length})
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteSubNode(e, snippet.id)}
                          className={`px-2 py-2 flex-shrink-0 transition-colors ${
                            deleteConfirmId === snippet.id
                              ? 'text-red-400'
                              : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400'
                          }`}
                          title={deleteConfirmId === snippet.id ? 'Click again to confirm delete' : 'Delete sub node'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

