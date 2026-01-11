import { NodeType } from '@automflows/shared';
import { useMemo, useState, useRef, useEffect } from 'react';
import { frontendPluginRegistry } from '../plugins/registry';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PlayCircleFilledWhiteTwoToneIcon from '@mui/icons-material/PlayCircleFilledWhiteTwoTone';
import LanguageIcon from '@mui/icons-material/Language';
import LinkIcon from '@mui/icons-material/Link';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CodeIcon from '@mui/icons-material/Code';
import LoopIcon from '@mui/icons-material/Loop';
import NumbersIcon from '@mui/icons-material/Numbers';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InputIcon from '@mui/icons-material/Input';
import VerifiedIcon from '@mui/icons-material/Verified';
import HttpIcon from '@mui/icons-material/Http';
import TerminalIcon from '@mui/icons-material/Terminal';
import InventoryIcon from '@mui/icons-material/Inventory';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

interface IconConfig {
  icon: React.ComponentType<{ sx?: any }>;
  color: string;
}

const nodeIconMap: Record<NodeType, IconConfig> = {
  [NodeType.START]: { icon: PlayCircleFilledWhiteTwoToneIcon, color: '#4CAF50' },
  [NodeType.OPEN_BROWSER]: { icon: LanguageIcon, color: '#2196F3' },
  [NodeType.NAVIGATE]: { icon: LinkIcon, color: '#2196F3' },
  [NodeType.CLICK]: { icon: TouchAppIcon, color: '#9C27B0' },
  [NodeType.TYPE]: { icon: KeyboardIcon, color: '#FF9800' },
  [NodeType.GET_TEXT]: { icon: TextFieldsIcon, color: '#4CAF50' },
  [NodeType.SCREENSHOT]: { icon: CameraAltIcon, color: '#F44336' },
  [NodeType.WAIT]: { icon: ScheduleIcon, color: '#FFC107' },
  [NodeType.JAVASCRIPT_CODE]: { icon: CodeIcon, color: '#2196F3' },
  [NodeType.LOOP]: { icon: LoopIcon, color: '#9C27B0' },
  [NodeType.INT_VALUE]: { icon: NumbersIcon, color: '#2196F3' },
  [NodeType.STRING_VALUE]: { icon: DescriptionIcon, color: '#4CAF50' },
  [NodeType.BOOLEAN_VALUE]: { icon: CheckCircleIcon, color: '#4CAF50' },
  [NodeType.INPUT_VALUE]: { icon: InputIcon, color: '#FF9800' },
  [NodeType.VERIFY]: { icon: VerifiedIcon, color: '#4CAF50' },
  [NodeType.API_REQUEST]: { icon: HttpIcon, color: '#2196F3' },
  [NodeType.API_CURL]: { icon: TerminalIcon, color: '#9C27B0' },
  [NodeType.LOAD_CONFIG_FILE]: { icon: FolderIcon, color: '#FF9800' },
  [NodeType.SELECT_CONFIG_FILE]: { icon: FolderOpenIcon, color: '#FF9800' },
};

function getNodeIconConfig(nodeType: NodeType | string): IconConfig | null {
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    return nodeIconMap[nodeType as NodeType] || { icon: InventoryIcon, color: '#757575' };
  }
  return null;
}

const NODE_CATEGORIES = [
  {
    label: 'Start',
    nodes: [
      { type: NodeType.START, label: 'Start' },
    ],
  },
  {
    label: 'Browser',
    nodes: [
      { type: NodeType.OPEN_BROWSER, label: 'Open Browser' },
      { type: NodeType.NAVIGATE, label: 'Navigate' },
    ],
  },
  {
    label: 'Interaction',
    nodes: [
      { type: NodeType.CLICK, label: 'Click' },
      { type: NodeType.TYPE, label: 'Type' },
    ],
  },
  {
    label: 'Data',
    nodes: [
      { type: NodeType.GET_TEXT, label: 'Get Text' },
      { type: NodeType.SCREENSHOT, label: 'Screenshot' },
    ],
  },
  {
    label: 'Verification',
    nodes: [
      { type: NodeType.VERIFY, label: 'Verify' },
    ],
  },
  {
    label: 'API',
    nodes: [
      { type: NodeType.API_REQUEST, label: 'API Request' },
      { type: NodeType.API_CURL, label: 'API cURL' },
    ],
  },
  {
    label: 'Control',
    nodes: [
      { type: NodeType.WAIT, label: 'Wait' },
      { type: NodeType.LOOP, label: 'Loop' },
    ],
  },
  {
    label: 'Code',
    nodes: [
      { type: NodeType.JAVASCRIPT_CODE, label: 'JavaScript Code' },
    ],
  },
  {
    label: 'Values',
    nodes: [
      { type: NodeType.INT_VALUE, label: 'Int Value' },
      { type: NodeType.STRING_VALUE, label: 'String Value' },
      { type: NodeType.BOOLEAN_VALUE, label: 'Boolean Value' },
      { type: NodeType.INPUT_VALUE, label: 'Input Value' },
    ],
  },
  {
    label: 'Configuration',
    nodes: [
      { type: NodeType.LOAD_CONFIG_FILE, label: 'Load Config File' },
      { type: NodeType.SELECT_CONFIG_FILE, label: 'Select Config File' },
    ],
  },
];

const STORAGE_KEY = 'leftSidebarCollapsed';

export default function LeftSidebar() {
  // Initialize collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'true';
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track plugin count to trigger re-render when plugins load
  const [pluginCount, setPluginCount] = useState(0);

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Monitor plugin registry changes
  useEffect(() => {
    const checkPlugins = () => {
      const currentCount = frontendPluginRegistry.getAllNodeDefinitions().length;
      if (currentCount !== pluginCount) {
        setPluginCount(currentCount);
      }
    };
    
    // Check immediately
    checkPlugins();
    
    // Poll for plugin changes (plugins load asynchronously)
    const interval = setInterval(checkPlugins, 100);
    
    // Stop polling after 5 seconds (plugins should load by then)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pluginCount]);

  // Get plugin nodes and group by category
  const pluginCategories = useMemo(() => {
    const pluginNodes = frontendPluginRegistry.getAllNodeDefinitions();
    const categoryMap = new Map<string, Array<{ type: string; label: string; icon: string }>>();

    pluginNodes.forEach((nodeDef) => {
      const category = nodeDef.category || 'Plugins';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push({
        type: nodeDef.type,
        label: nodeDef.label,
        icon: nodeDef.icon || '📦',
      });
    });

    return Array.from(categoryMap.entries()).map(([label, nodes]) => ({
      label,
      nodes,
    }));
  }, [pluginCount]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: NodeType | string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
    setActiveNode(type);
  };

  const handleDragEnd = () => {
    // Clear active state after drag ends
    setTimeout(() => setActiveNode(null), 200);
  };

  // Handle tooltip delay
  useEffect(() => {
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    // If collapsed and hovering over a node, set timeout to show tooltip
    if (isCollapsed && hoveredNode) {
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(hoveredNode);
      }, 2000); // 2 second delay
    } else {
      setShowTooltip(null);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [isCollapsed, hoveredNode]);

  const handleMouseEnter = (nodeId: string) => {
    setHoveredNode(nodeId);
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
    setShowTooltip(null);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  };

  // Merge categories with the same label to avoid duplicates
  const allCategories = useMemo(() => {
    const categoryMap = new Map<string, Array<{ type: string; label: string; icon?: string }>>();
    
    // Add predefined categories
    NODE_CATEGORIES.forEach((category) => {
      categoryMap.set(category.label, [...category.nodes]);
    });
    
    // Merge plugin categories (add nodes to existing categories or create new ones)
    pluginCategories.forEach((category) => {
      if (categoryMap.has(category.label)) {
        // Merge nodes into existing category
        const existingNodes = categoryMap.get(category.label)!;
        categoryMap.set(category.label, [...existingNodes, ...category.nodes]);
      } else {
        // Create new category
        categoryMap.set(category.label, [...category.nodes]);
      }
    });
    
    return Array.from(categoryMap.entries()).map(([label, nodes]) => ({
      label,
      nodes,
    }));
  }, [pluginCategories]);

  return (
    <div
      className={`relative bg-gray-800 border-r border-gray-700 overflow-y-auto transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => {
          setIsCollapsed((prev) => !prev);
        }}
        className="absolute top-4 right-2 z-10 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronLeft size={16} />
        )}
      </button>

      <div className={`p-4 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 pr-8">Node Library</h2>
        )}
        <div className="space-y-6">
          {allCategories.map((category) => (
            <div key={category.label}>
              {!isCollapsed && (
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2 px-1">
                  {category.label}
                </h3>
              )}
              <div className="space-y-1">
                {category.nodes.map((node) => {
                  const nodeId = node.type;
                  const isHovered = hoveredNode === nodeId;
                  const isActive = activeNode === nodeId;

                  return (
                    <div
                      key={nodeId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, nodeId)}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={() => handleMouseEnter(nodeId)}
                      onMouseLeave={handleMouseLeave}
                      className={`
                        relative group
                        ${isCollapsed ? 'p-2' : 'p-2'}
                        bg-gray-700 
                        hover:bg-gray-600 
                        rounded 
                        cursor-move 
                        flex 
                        items-center 
                        ${isCollapsed ? 'justify-center' : 'gap-2'} 
                        text-sm 
                        text-gray-200 
                        transition-all 
                        duration-200
                        ${isHovered ? 'shadow-md scale-[1.02]' : ''}
                        ${isActive ? 'bg-blue-600/30 hover:bg-blue-600/40' : ''}
                      `}
                      title={isCollapsed ? node.label : undefined}
                    >
                      {/* Active state accent bar */}
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l" />
                      )}
                      
                      {/* Icon */}
                      {(() => {
                        const iconConfig = getNodeIconConfig(node.type);
                        if (iconConfig) {
                          const IconComponent = iconConfig.icon;
                          return <IconComponent sx={{ fontSize: '1.25rem', color: iconConfig.color }} />;
                        }
                        // Fallback for plugin nodes that still use string icons
                        const pluginNode = frontendPluginRegistry.getPluginNode(node.type);
                        return <span className="text-lg flex-shrink-0">{pluginNode?.icon || '📦'}</span>;
                      })()}
                      
                      {/* Label - hidden when collapsed */}
                      {!isCollapsed && (
                        <span className="truncate flex-1">{node.label}</span>
                      )}
                      
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && showTooltip === nodeId && (
                        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-md shadow-xl whitespace-nowrap z-[100] pointer-events-none border border-gray-700 transition-opacity duration-200 opacity-100">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                          {node.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

