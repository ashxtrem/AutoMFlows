import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { NodeType } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
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
import TableChartIcon from '@mui/icons-material/TableChart';

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
  [NodeType.CSV_HANDLE]: { icon: TableChartIcon, color: '#00BCD4' },
};

function getNodeIconConfig(nodeType: NodeType | string): IconConfig | null {
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    return nodeIconMap[nodeType as NodeType] || { icon: InventoryIcon, color: '#757575' };
  }
  return null;
}

function getNodeLabel(nodeType: NodeType | string): string {
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
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
      [NodeType.CSV_HANDLE]: 'CSV Handle',
    };
    return labels[nodeType as NodeType] || nodeType;
  }
  
  const nodeDef = frontendPluginRegistry.getNodeDefinition(nodeType);
  if (nodeDef) {
    return nodeDef.label;
  }
  
  return nodeType;
}

interface CanvasSearchOverlayProps {
  position: { x: number; y: number }; // Screen position for overlay display
  flowPosition: { x: number; y: number }; // Flow position for node placement
  onClose: () => void;
  onNodeSelect: (nodeType: string, flowPosition: { x: number; y: number }) => void;
}

export default function CanvasSearchOverlay({ position, flowPosition, onClose, onNodeSelect }: CanvasSearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when overlay opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use setTimeout to avoid immediate close when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  // Get all available nodes
  const allNodes = useMemo(() => {
    const nodes: Array<{ type: string; label: string }> = [];
    
    // Add built-in nodes (exclude SELECT_CONFIG_FILE as it's deprecated)
    Object.values(NodeType).forEach((nodeType) => {
      if (nodeType !== NodeType.SELECT_CONFIG_FILE) {
        nodes.push({
          type: nodeType,
          label: getNodeLabel(nodeType),
        });
      }
    });
    
    // Add plugin nodes
    const pluginNodes = frontendPluginRegistry.getAllNodeDefinitions();
    pluginNodes.forEach((nodeDef) => {
      nodes.push({
        type: nodeDef.type,
        label: nodeDef.label,
      });
    });
    
    return nodes;
  }, []);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return allNodes;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const queryWords = query.split(/\s+/).filter(word => word.length > 0);
    
    return allNodes.filter((node) => {
      const normalizedLabel = node.label.toLowerCase();
      if (queryWords.length === 1) {
        return normalizedLabel.includes(queryWords[0]);
      }
      return queryWords.every(word => normalizedLabel.includes(word));
    });
  }, [allNodes, searchQuery]);

  const handleNodeClick = (nodeType: string) => {
    onNodeSelect(nodeType, flowPosition);
    onClose();
  };

  // Calculate position with boundary checks to keep overlay within viewport
  const overlayWidth = 300;
  const overlayHeight = 500;
  const padding = 10;
  
  // Get viewport dimensions (approximate, will be adjusted by CSS if needed)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Adjust position to keep overlay within bounds
  const adjustedX = Math.max(padding, Math.min(position.x, viewportWidth - overlayWidth - padding));
  const adjustedY = Math.max(padding, Math.min(position.y, viewportHeight - overlayHeight - padding));

  return (
    <div
      ref={overlayRef}
      className="absolute z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        minWidth: '300px',
        maxWidth: '400px',
        maxHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Search Input */}
      <div className="p-3 border-b border-gray-700">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={16} />
          </div>
          <input
            ref={inputRef}
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

      {/* Node List */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: '400px' }}>
        {filteredNodes.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No nodes found
          </div>
        ) : (
          <div className="p-2">
            {filteredNodes.map((node) => {
              const iconConfig = getNodeIconConfig(node.type);
              const pluginNode = frontendPluginRegistry.getPluginNode(node.type);
              
              return (
                <button
                  key={node.type}
                  onClick={() => handleNodeClick(node.type)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 text-left transition-colors text-sm text-gray-200"
                >
                  {/* Icon */}
                  {iconConfig ? (
                    <iconConfig.icon sx={{ fontSize: '1.25rem', color: iconConfig.color }} />
                  ) : node.type === 'setConfig.setConfig' ? (
                    <div className="flex-shrink-0 p-0.5 rounded border-2 border-orange-500">
                      <EditIcon sx={{ fontSize: '1rem', color: '#FF9800' }} />
                    </div>
                  ) : (
                    <span className="text-lg flex-shrink-0">{pluginNode?.icon || '📦'}</span>
                  )}
                  
                  {/* Label */}
                  <span className="truncate flex-1">{node.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
