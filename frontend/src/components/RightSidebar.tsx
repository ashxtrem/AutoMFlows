import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { NodeType } from '@automflows/shared';
import { useWorkflowStore } from '../store/workflowStore';
import { frontendPluginRegistry } from '../plugins/registry';
import NodeConfigForm from './NodeConfigForm';

const STORAGE_KEY_RIGHT_SIDEBAR_WIDTH = 'rightSidebarWidth';
const DEFAULT_WIDTH = 320; // w-80 = 320px
const MIN_WIDTH = 200;
const MAX_WIDTH_PERCENT = 50; // 50% of window width

function getNodeLabel(type: NodeType | string): string {
  if (Object.values(NodeType).includes(type as NodeType)) {
    const labels: Record<NodeType, string> = {
      [NodeType.START]: 'Start',
      [NodeType.OPEN_BROWSER]: 'Open Browser',
      [NodeType.NAVIGATION]: 'Navigation',
      [NodeType.KEYBOARD]: 'Keyboard',
      [NodeType.SCROLL]: 'Scroll',
      [NodeType.STORAGE]: 'Storage',
      [NodeType.DIALOG]: 'Dialog',
      [NodeType.DOWNLOAD]: 'Download',
      [NodeType.IFRAME]: 'Iframe',
      [NodeType.ACTION]: 'Action',
      [NodeType.ELEMENT_QUERY]: 'Element Query',
      [NodeType.FORM_INPUT]: 'Form Input',
      [NodeType.TYPE]: 'Type',
      [NodeType.SCREENSHOT]: 'Screenshot',
      [NodeType.WAIT]: 'Wait',
      [NodeType.JAVASCRIPT_CODE]: 'JavaScript Code',
      [NodeType.LOOP]: 'Loop',
      [NodeType.INT_VALUE]: 'Int Value',
      [NodeType.STRING_VALUE]: 'String Value',
      [NodeType.BOOLEAN_VALUE]: 'Boolean Value',
      [NodeType.INPUT_VALUE]: 'Input Value',
      [NodeType.VERIFY]: 'Verify',
      [NodeType.API_REQUEST]: 'API Request',
      [NodeType.API_CURL]: 'API cURL',
      [NodeType.LOAD_CONFIG_FILE]: 'Load Config File',
      [NodeType.SELECT_CONFIG_FILE]: 'Select Config File',
      [NodeType.DB_CONNECT]: 'DB Connect',
      [NodeType.DB_DISCONNECT]: 'DB Disconnect',
      [NodeType.DB_QUERY]: 'DB Query',
      [NodeType.CONTEXT_MANIPULATE]: 'Context Manipulate',
    };
    return labels[type as NodeType] || type;
  }
  
  const nodeDef = frontendPluginRegistry.getNodeDefinition(type);
  if (nodeDef) {
    return nodeDef.label;
  }
  
  return type;
}

export default function RightSidebar() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const [width, setWidth] = useState(() => {
    // Initialize width from localStorage
    const saved = localStorage.getItem(STORAGE_KEY_RIGHT_SIDEBAR_WIDTH);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef<number | null>(null);
  const startWidthRef = useRef<number | null>(null);

  // Save width to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RIGHT_SIDEBAR_WIDTH, String(width));
  }, [width]);

  // Calculate max width based on window width
  const getMaxWidth = useCallback(() => {
    return (window.innerWidth * MAX_WIDTH_PERCENT) / 100;
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startPosRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  // Handle resize during drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent | PointerEvent) => {
      if (startPosRef.current !== null && startWidthRef.current !== null) {
        // Calculate delta (negative because we're resizing from left edge of right sidebar)
        const deltaX = startPosRef.current - e.clientX;
        const newWidth = startWidthRef.current + deltaX;
        const maxWidth = getMaxWidth();
        
        // Clamp width between min and max
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(newWidth, maxWidth));
        setWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      startPosRef.current = null;
      startWidthRef.current = null;
    };

    // Use capture phase to ensure we catch events
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
  }, [isResizing, getMaxWidth]);

  // Update max width on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      const maxWidth = getMaxWidth();
      if (width > maxWidth) {
        setWidth(maxWidth);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [width, getMaxWidth]);

  if (!selectedNode) {
    return null;
  }

  // Get the node label: use custom label if available, otherwise use default label
  const customLabel = selectedNode.data.label;
  const defaultLabel = getNodeLabel(selectedNode.data.type);
  const nodeLabel = customLabel || defaultLabel;

  return (
    <div 
      className="bg-gray-800 border-l border-gray-700 overflow-y-auto relative flex z-30 flex-shrink-0 h-full"
      style={{ width: `${width}px`, minWidth: `${MIN_WIDTH}px` }}
      data-testid="right-sidebar"
      data-tour="right-sidebar"
    >
      {/* Resize handle on the left edge */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors z-10 ${
          isResizing ? 'bg-blue-500' : 'bg-transparent'
        }`}
        onMouseDown={handleResizeStart}
        onPointerDown={handleResizeStart}
        style={{ pointerEvents: 'auto' }}
        title="Drag to resize"
      />
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{nodeLabel} | Node Properties</h2>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <NodeConfigForm node={selectedNode} />
      </div>
    </div>
  );
}

