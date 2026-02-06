import { NodeType } from '@automflows/shared';
import { useMemo, useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { frontendPluginRegistry } from '../plugins/registry';
import { Search, X, Menu, Pin, PinOff, BookOpen } from 'lucide-react';
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
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';

interface IconConfig {
  icon: React.ComponentType<{ sx?: any }>;
  color: string;
}

const nodeIconMap: Record<NodeType, IconConfig> = {
  [NodeType.START]: { icon: PlayCircleFilledWhiteTwoToneIcon, color: '#4CAF50' },
  [NodeType.OPEN_BROWSER]: { icon: LanguageIcon, color: '#2196F3' },
  [NodeType.CONTEXT_MANIPULATE]: { icon: SettingsIcon, color: '#9C27B0' },
  [NodeType.NAVIGATION]: { icon: LinkIcon, color: '#2196F3' },
  [NodeType.KEYBOARD]: { icon: KeyboardIcon, color: '#FF9800' },
  [NodeType.SCROLL]: { icon: ScheduleIcon, color: '#9C27B0' },
  [NodeType.STORAGE]: { icon: InventoryIcon, color: '#2196F3' },
  [NodeType.DIALOG]: { icon: VerifiedIcon, color: '#4CAF50' },
  [NodeType.DOWNLOAD]: { icon: FolderOpenIcon, color: '#FF9800' },
  [NodeType.IFRAME]: { icon: LanguageIcon, color: '#2196F3' },
  [NodeType.ACTION]: { icon: TouchAppIcon, color: '#9C27B0' },
  [NodeType.ELEMENT_QUERY]: { icon: TextFieldsIcon, color: '#4CAF50' },
  [NodeType.FORM_INPUT]: { icon: CheckCircleIcon, color: '#FF9800' },
  [NodeType.TYPE]: { icon: KeyboardIcon, color: '#FF9800' },
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
  [NodeType.DB_CONNECT]: { icon: StorageIcon, color: '#4CAF50' },
  [NodeType.DB_DISCONNECT]: { icon: StorageIcon, color: '#F44336' },
  [NodeType.DB_QUERY]: { icon: StorageIcon, color: '#2196F3' },
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
      { type: NodeType.CONTEXT_MANIPULATE, label: 'Context Manipulate' },
      { type: NodeType.NAVIGATION, label: 'Navigation' },
      { type: NodeType.KEYBOARD, label: 'Keyboard' },
      { type: NodeType.SCROLL, label: 'Scroll' },
      { type: NodeType.DIALOG, label: 'Dialog' },
      { type: NodeType.DOWNLOAD, label: 'Download' },
      { type: NodeType.IFRAME, label: 'Iframe' },
    ],
  },
  {
    label: 'Interaction',
    nodes: [
      { type: NodeType.ACTION, label: 'Action' },
      { type: NodeType.FORM_INPUT, label: 'Form Input' },
      { type: NodeType.TYPE, label: 'Type' },
    ],
  },
  {
    label: 'Storage',
    nodes: [
      { type: NodeType.STORAGE, label: 'Storage' },
    ],
  },
  {
    label: 'Data',
    nodes: [
      { type: NodeType.ELEMENT_QUERY, label: 'Element Query' },
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
    label: 'Database',
    nodes: [
      { type: NodeType.DB_CONNECT, label: 'DB Connect' },
      { type: NodeType.DB_DISCONNECT, label: 'DB Disconnect' },
      { type: NodeType.DB_QUERY, label: 'DB Query' },
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
    ],
  },
];

const STORAGE_KEY_PINNED = 'leftSidebarPinned';
const STORAGE_KEY_TAB = 'leftSidebarActiveTab';
const STORAGE_KEY_EXPANDED = 'leftSidebarExpanded';

const DEFAULT_WIDTH = 256;

type TabType = 'all' | 'browser' | 'api' | 'db' | 'utils';

export interface LeftSidebarHandle {
  hide: () => void;
  isPinned: () => boolean;
  isExpanded: () => boolean;
}

// Helper function to determine node's primary category
function getNodeCategory(nodeType: NodeType | string, _nodeLabel?: string): 'browser' | 'api' | 'db' | 'utils' {
  // Check if it's a plugin node
  const pluginNode = frontendPluginRegistry.getNodeDefinition(nodeType);
  if (pluginNode) {
    const category = (pluginNode.category || '').toLowerCase();
    if (category.includes('browser') || category.includes('ui') || category.includes('interaction')) {
      return 'browser';
    }
    if (category.includes('api') || category.includes('http') || category.includes('request')) {
      return 'api';
    }
    return 'utils';
  }

  // Built-in node categorization
  switch (nodeType) {
    case NodeType.OPEN_BROWSER:
    case NodeType.ACTION:
    case NodeType.TYPE:
    case NodeType.FORM_INPUT:
    case NodeType.ELEMENT_QUERY:
    case NodeType.SCREENSHOT:
      return 'browser';
    case NodeType.VERIFY:
      // Verify can be browser or API depending on domain, default to utils
      return 'utils';
    case NodeType.API_REQUEST:
    case NodeType.API_CURL:
      return 'api';
    case NodeType.DB_CONNECT:
    case NodeType.DB_DISCONNECT:
    case NodeType.DB_QUERY:
      return 'db';
    case NodeType.JAVASCRIPT_CODE:
    case NodeType.WAIT:
    case NodeType.LOOP:
    case NodeType.INT_VALUE:
    case NodeType.STRING_VALUE:
    case NodeType.BOOLEAN_VALUE:
    case NodeType.INPUT_VALUE:
    case NodeType.LOAD_CONFIG_FILE:
    case NodeType.START:
    default:
      return 'utils';
  }
}

const LeftSidebar = forwardRef<LeftSidebarHandle>((_props, ref) => {
  // Initialize states from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_EXPANDED);
    return saved === 'true';
  });
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PINNED);
    return saved === 'true';
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TAB);
    return (saved as TabType) || 'all';
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [pluginCount, setPluginCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    hide: () => {
      if (!isPinned) {
        setIsExpanded(false);
      }
    },
    isPinned: () => isPinned,
    isExpanded: () => isExpanded,
  }), [isPinned, isExpanded]);

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PINNED, String(isPinned));
  }, [isPinned]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPANDED, String(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TAB, activeTab);
  }, [activeTab]);

  // Restore expanded state on mount if pinned
  useEffect(() => {
    if (isPinned && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isPinned]); // Only run when pin state changes

  // Monitor plugin registry changes
  useEffect(() => {
    const checkPlugins = () => {
      const currentCount = frontendPluginRegistry.getAllNodeDefinitions().length;
      if (currentCount !== pluginCount) {
        setPluginCount(currentCount);
      }
    };
    
    checkPlugins();
    const interval = setInterval(checkPlugins, 100);
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
    setTimeout(() => setActiveNode(null), 200);
  };

  // Search function that matches two-word combinations
  const matchesSearch = (text: string, query: string): boolean => {
    if (!query.trim()) return true;
    
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
    
    if (queryWords.length === 1) {
      return normalizedText.includes(queryWords[0]);
    }
    
    return queryWords.every(word => normalizedText.includes(word));
  };

  // Merge categories with the same label to avoid duplicates
  const allCategories = useMemo(() => {
    const categoryMap = new Map<string, Array<{ type: string; label: string; icon?: string }>>();
    
    NODE_CATEGORIES.forEach((category) => {
      categoryMap.set(category.label, [...category.nodes]);
    });
    
    pluginCategories.forEach((category) => {
      if (categoryMap.has(category.label)) {
        const existingNodes = categoryMap.get(category.label)!;
        categoryMap.set(category.label, [...existingNodes, ...category.nodes]);
      } else {
        categoryMap.set(category.label, [...category.nodes]);
      }
    });
    
    return Array.from(categoryMap.entries()).map(([label, nodes]) => ({
      label,
      nodes,
    }));
  }, [pluginCategories]);

  // Filter categories based on active tab
  const tabFilteredCategories = useMemo(() => {
    if (activeTab === 'all') {
      return allCategories;
    }

    const filteredMap = new Map<string, Array<{ type: string; label: string; icon?: string }>>();
    
    allCategories.forEach((category) => {
      const matchingNodes = category.nodes.filter((node) => {
        const nodeCategory = getNodeCategory(node.type, node.label);
        return nodeCategory === activeTab;
      });
      
      if (matchingNodes.length > 0) {
        if (filteredMap.has(category.label)) {
          const existingNodes = filteredMap.get(category.label)!;
          filteredMap.set(category.label, [...existingNodes, ...matchingNodes]);
        } else {
          filteredMap.set(category.label, matchingNodes);
        }
      }
    });
    
    return Array.from(filteredMap.entries()).map(([label, nodes]) => ({
      label,
      nodes,
    }));
  }, [allCategories, activeTab]);

  // Filter categories and nodes based on search query
  const filteredCategories = useMemo(() => {
    const categoriesToFilter = tabFilteredCategories;
    
    if (!searchQuery.trim()) {
      return categoriesToFilter;
    }

    return categoriesToFilter
      .map((category) => {
        const filteredNodes = category.nodes.filter((node) =>
          matchesSearch(node.label, searchQuery) || matchesSearch(category.label, searchQuery)
        );
        
        if (filteredNodes.length > 0 || matchesSearch(category.label, searchQuery)) {
          return {
            ...category,
            nodes: filteredNodes.length > 0 ? filteredNodes : category.nodes,
          };
        }
        return null;
      })
      .filter((category): category is NonNullable<typeof category> => category !== null);
  }, [tabFilteredCategories, searchQuery]);

  // Prevent clicks inside menu from propagating to canvas
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* FAB Button - shows when not expanded, positioned next to zoom controls */}
      {!isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className="fixed bottom-5 z-30 w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
          data-tour="left-sidebar"
          aria-label="Open node library"
          style={{ left: '60px' }}
        >
          <Menu size={24} className="text-gray-200" />
        </button>
      )}

          {/* Expanded Menu */}
      {isExpanded && (
        <div
          ref={menuRef}
          onClick={handleMenuClick}
          className="fixed bottom-5 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl flex flex-col transition-all duration-300 ease-in-out"
          style={{ width: `${DEFAULT_WIDTH}px`, height: 'calc(100vh - 120px)', maxHeight: '600px', left: '60px' }}
          data-tour="left-sidebar"
        >
          {/* Header with Pin Button and Wiki Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase">Node Library</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('/wiki/index.html', '_blank');
                }}
                className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                aria-label="Open wiki"
                title="Open documentation wiki"
              >
                <BookOpen size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned((prev) => !prev);
                }}
                className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
              </button>
            </div>
          </div>

          {/* Scrollable Content Area - Nodes */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {filteredCategories.map((category) => (
                <div key={category.label}>
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-2 px-1">
                    {category.label}
                  </h3>
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
                          onMouseEnter={() => setHoveredNode(nodeId)}
                          onMouseLeave={() => setHoveredNode(null)}
                          className={`
                            relative group
                            p-2
                            bg-gray-700 
                            hover:bg-gray-600 
                            rounded 
                            cursor-move 
                            flex 
                            items-center 
                            gap-2
                            text-sm 
                            text-gray-200 
                            transition-all 
                            duration-200
                            ${isHovered ? 'shadow-md scale-[1.02]' : ''}
                            ${isActive ? 'bg-blue-600/30 hover:bg-blue-600/40' : ''}
                          `}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l" />
                          )}
                          
                          {(() => {
                            const iconConfig = getNodeIconConfig(node.type);
                            if (iconConfig) {
                              const IconComponent = iconConfig.icon;
                              return <IconComponent sx={{ fontSize: '1.25rem', color: iconConfig.color }} />;
                            }
                            // Special handling for setConfig.setConfig to use EditIcon with orange border
                            if (node.type === 'setConfig.setConfig') {
                              return (
                                <div className="flex-shrink-0 p-0.5 rounded border-2 border-orange-500">
                                  <EditIcon sx={{ fontSize: '1rem', color: '#FF9800' }} />
                                </div>
                              );
                            }
                            const pluginNode = frontendPluginRegistry.getPluginNode(node.type);
                            return <span className="text-lg flex-shrink-0">{pluginNode?.icon || '📦'}</span>;
                          })()}
                          
                          <span className="truncate flex-1">{node.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Fixed Section - Tabs and Search */}
          <div className="border-t border-gray-700 bg-gray-800">
            {/* Tabs */}
            <div className="flex border-b border-gray-700 px-4 relative">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('browser')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'browser'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Browser
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'api'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                API
              </button>
              <button
                onClick={() => setActiveTab('db')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'db'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                DB
              </button>
              <button
                onClick={() => setActiveTab('utils')}
                className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                  activeTab === 'utils'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Utils
                {/* 2px indicator at rightmost tab */}
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gray-600" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-4 pt-2">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes..."
                  className="w-full pl-10 pr-8 py-2 bg-gray-700 text-gray-200 placeholder-gray-400 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

LeftSidebar.displayName = 'LeftSidebar';

export default LeftSidebar;
