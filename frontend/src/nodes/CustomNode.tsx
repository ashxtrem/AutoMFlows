import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { shallow } from 'zustand/shallow';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType, PropertyDataType, OpenBrowserNodeData } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
import { useWorkflowStore } from '../store/workflowStore';
import { useSettingsStore } from '../store/settingsStore';
import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea, InlineCheckbox } from '../components/InlinePropertyEditor';
import NodeMenuBar from '../components/NodeMenuBar';
import CapabilitiesPopup from '../components/CapabilitiesPopup';
import PropertyEditorPopup, { PropertyEditorType } from '../components/PropertyEditorPopup';
import MarkdownEditorPopup from '../components/MarkdownEditorPopup';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { getNodeProperties, isPropertyInputConnection, getPropertyInputHandleId } from '../utils/nodeProperties';
import { getContrastTextColor } from '../utils/colorContrast';
import { validateShortcut } from '../utils/shortcutValidator';
import { isDeprecatedNodeType, getMigrationSuggestion } from '../utils/migration';
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
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import InputIcon from '@mui/icons-material/Input';
import VerifiedIcon from '@mui/icons-material/Verified';
import HttpIcon from '@mui/icons-material/Http';
import TerminalIcon from '@mui/icons-material/Terminal';
import InventoryIcon from '@mui/icons-material/Inventory';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import StorageIcon from '@mui/icons-material/Storage';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';
import CookieIcon from '@mui/icons-material/Cookie';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import DownloadIcon from '@mui/icons-material/Download';
import PictureInPictureIcon from '@mui/icons-material/PictureInPicture';

interface IconConfig {
  icon: React.ComponentType<{ sx?: any }>;
  color: string;
}

const nodeIcons: Record<NodeType, IconConfig> = {
  [NodeType.START]: { icon: PlayCircleFilledWhiteTwoToneIcon, color: '#4CAF50' },
  [NodeType.OPEN_BROWSER]: { icon: LanguageIcon, color: '#2196F3' },
  [NodeType.NAVIGATION]: { icon: LinkIcon, color: '#2196F3' },
  [NodeType.KEYBOARD]: { icon: KeyboardIcon, color: '#FF9800' },
  [NodeType.SCROLL]: { icon: VerticalAlignCenterIcon, color: '#9C27B0' },
  [NodeType.STORAGE]: { icon: CookieIcon, color: '#FF9800' },
  [NodeType.DIALOG]: { icon: ChatBubbleIcon, color: '#2196F3' },
  [NodeType.DOWNLOAD]: { icon: DownloadIcon, color: '#4CAF50' },
  [NodeType.IFRAME]: { icon: PictureInPictureIcon, color: '#9C27B0' },
  [NodeType.ACTION]: { icon: TouchAppIcon, color: '#9C27B0' },
  [NodeType.ELEMENT_QUERY]: { icon: TextFieldsIcon, color: '#4CAF50' },
  [NodeType.FORM_INPUT]: { icon: CheckBoxIcon, color: '#FF9800' },
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

function getNodeIcon(nodeType: NodeType | string): IconConfig | null {
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    return nodeIcons[nodeType as NodeType] || { icon: InventoryIcon, color: '#757575' };
  }
  
  const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
  if (pluginNode && pluginNode.icon) {
    // For plugin nodes, return null to use the string icon fallback
    return null;
  }
  
  return { icon: InventoryIcon, color: '#757575' };
}

// Helper function to get node glow color based on node type
// Helper function to convert hex color to rgba
function hexToRgba(hex: string, alpha: number = 0.5): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getNodeGlowColor(nodeType: NodeType | string, userBackgroundColor?: string): string {
  // Use user-selected backgroundColor if provided, otherwise fall back to node type color
  if (userBackgroundColor && userBackgroundColor !== '#1f2937') {
    return hexToRgba(userBackgroundColor, 0.5);
  }
  
  // Fall back to node type color
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    const iconConfig = nodeIcons[nodeType as NodeType];
    if (iconConfig) {
      return hexToRgba(iconConfig.color, 0.5);
    }
  }
  return 'rgba(117, 117, 117, 0.5)'; // Default grey glow
}

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
    };
    return labels[type as NodeType] || type;
  }
  
  const nodeDef = frontendPluginRegistry.getNodeDefinition(type);
  if (nodeDef) {
    return nodeDef.label;
  }
  
  return type;
}

interface ResizeHandleProps {
  onResize: (deltaX: number, deltaY: number) => void;
}

function ResizeHandle({ onResize }: ResizeHandleProps) {
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

export default function CustomNode({ id, data, selected }: NodeProps) {
  const width = (data as any).width;
  const height = (data as any).height;
  // State for capabilities popup (only used for OPEN_BROWSER nodes)
  const [showCapabilitiesPopup, setShowCapabilitiesPopup] = useState(false);
  
  // State for property editor popup
  const [propertyPopup, setPropertyPopup] = useState<{
    type: PropertyEditorType;
    label: string;
    field: string; // Store field name to read latest value
    value: any;
    onChange: (value: any) => void;
    placeholder?: string;
    min?: number;
    max?: number;
  } | null>(null);
  
  // State for markdown editor popup (for comment box)
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  
  // State for shortcut validation error
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  
  // Get latest node data from store to avoid stale prop issues
  const storeNodes = useWorkflowStore((state) => state.nodes);
  const storeNodeData = storeNodes.find(n => n.id === id)?.data;
  // Use data prop for searchHighlighted (set in mappedNodes) but fall back to store for other properties
  // This ensures searchHighlighted updates correctly when search results change
  const latestNodeData = { ...storeNodeData, ...data };
  // Check if this node is currently paused
  const pausedNodeId = useWorkflowStore((state) => state.pausedNodeId);
  const isPaused = pausedNodeId === id;
  // Get theme for text color adjustments
  const theme = useSettingsStore((state) => state.appearance.theme);
  
  // Stabilize data prop by comparing content, not reference
  // This prevents infinite loops when ReactFlow recreates data objects with same content
  // Use a more stable comparison - compare key properties instead of JSON.stringify
  // Use latestNodeData instead of data prop to get fresh updates from store
  const dataRef = useRef(latestNodeData);
  const dataKeyRef = useRef<string>('');
  
  // Create a stable key from data properties (sorted for consistency)
  // Include _inputConnections to detect when properties are converted to inputs
  // Include backgroundColor to detect when color changes
  // Include isMinimized, bypass, failSilently to detect when these change
  // Include value for value nodes (INT_VALUE, STRING_VALUE, BOOLEAN_VALUE, INPUT_VALUE) to detect value changes
  const inputConnectionsKey = latestNodeData._inputConnections ? JSON.stringify(latestNodeData._inputConnections) : '';
  const backgroundColorKey = latestNodeData.backgroundColor || '';
  const isMinimizedKey = latestNodeData.isMinimized || false;
  const bypassKey = latestNodeData.bypass || false;
  const failSilentlyKey = latestNodeData.failSilently || false;
  // Include value for value nodes
  const valueKey = (latestNodeData.type === NodeType.INT_VALUE || 
                    latestNodeData.type === NodeType.STRING_VALUE || 
                    latestNodeData.type === NodeType.BOOLEAN_VALUE || 
                    latestNodeData.type === NodeType.INPUT_VALUE) 
    ? `|value:${JSON.stringify(latestNodeData.value)}` 
    : '';
  // Include dataType for INPUT_VALUE nodes
  const dataTypeKey = latestNodeData.type === NodeType.INPUT_VALUE 
    ? `|dataType:${latestNodeData.dataType || PropertyDataType.STRING}` 
    : '';
  // Include maxWindow and other browser properties in the key for OPEN_BROWSER nodes
  const browserDataKey = latestNodeData.type === NodeType.OPEN_BROWSER 
    ? `|maxWindow:${latestNodeData.maxWindow}|browser:${latestNodeData.browser || 'chromium'}|stealthMode:${latestNodeData.stealthMode || false}|capabilities:${latestNodeData.capabilities ? Object.keys(latestNodeData.capabilities).length : 0}|launchOptions:${latestNodeData.launchOptions ? Object.keys(latestNodeData.launchOptions).length : 0}`
    : '';
  const apiRequestDataKey = latestNodeData.type === NodeType.API_REQUEST 
    ? `|method:${latestNodeData.method || 'GET'}|url:${latestNodeData.url || ''}|timeout:${latestNodeData.timeout || ''}|contextKey:${latestNodeData.contextKey || ''}` 
    : '';
  const apiCurlDataKey = latestNodeData.type === NodeType.API_CURL 
    ? `|curlCommand:${latestNodeData.curlCommand || ''}|timeout:${latestNodeData.timeout || ''}|contextKey:${latestNodeData.contextKey || ''}` 
    : '';
  const currentDataKey = `${latestNodeData.type}|${latestNodeData.label || ''}|${latestNodeData.code || ''}|${latestNodeData.width || ''}|${latestNodeData.height || ''}|${inputConnectionsKey}|${backgroundColorKey}|isMinimized:${isMinimizedKey}|bypass:${bypassKey}|failSilently:${failSilentlyKey}${valueKey}${dataTypeKey}${browserDataKey}${apiRequestDataKey}${apiCurlDataKey}`;
  const dataContentChanged = dataKeyRef.current !== currentDataKey;
  
  if (dataContentChanged) {
    dataRef.current = latestNodeData;
    dataKeyRef.current = currentDataKey;
  }
  
  // Use stable data reference that only changes when content changes
  // But use latestNodeData for property values to ensure real-time updates
  const stableData = dataRef.current;
  
  // Use latestNodeData for rendering to ensure real-time updates
  // stableData is kept for reference stability in other contexts
  const renderData = latestNodeData;
  
  // Force re-render when node data changes by using a state that tracks data changes
  // This ensures ReactFlow re-renders CustomNode even when it memoizes nodes
  const [, setDataVersion] = useState(0);
  const lastDataVersionRef = useRef<string>('');
  
  // Create a version key from important data fields to detect changes
  const currentDataVersion = JSON.stringify({
    url: latestNodeData.url,
    timeout: latestNodeData.timeout,
    selector: latestNodeData.selector,
    text: latestNodeData.text,
    code: latestNodeData.code,
    value: latestNodeData.value,
    outputVariable: latestNodeData.outputVariable,
    arrayVariable: latestNodeData.arrayVariable,
    method: latestNodeData.method,
    curlCommand: latestNodeData.curlCommand,
    contextKey: latestNodeData.contextKey,
  });
  
  // Update version when data changes to force re-render
  useEffect(() => {
    if (lastDataVersionRef.current !== currentDataVersion) {
      lastDataVersionRef.current = currentDataVersion;
      // Update state to force React re-render
      // The component reads from latestNodeData which comes from store, so re-render will show updated values
      setDataVersion(prev => prev + 1);
    }
  }, [currentDataVersion, id, latestNodeData.url, latestNodeData.timeout]);
  
  const nodeType = renderData.type as NodeType | string;
  
  const customLabel = renderData.label;
  const defaultLabel = getNodeLabel(nodeType);
  const label = customLabel || defaultLabel;
  const icon = getNodeIcon(nodeType);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNodeDimensions = useWorkflowStore((state) => state.updateNodeDimensions);
  const renameNode = useWorkflowStore((state) => state.renameNode);
  const autoResizeNode = useWorkflowStore((state) => state.autoResizeNode);
  const edgesRaw = useWorkflowStore((state) => state.edges);
  const nodesRaw = useWorkflowStore((state) => state.nodes);
  
  // Read node-specific data directly from store using a selector with shallow equality
  // This ensures we always get latest values and only re-render when values actually change
  const nodeDataFromStore = useWorkflowStore(
    (state) => {
      const node = state.nodes.find(n => n.id === id);
      return {
        bypass: node?.data?.bypass || false,
        failSilently: node?.data?.failSilently || false,
        breakpoint: node?.data?.breakpoint || false,
        isMinimized: node?.data?.isMinimized || false,
        isTest: node?.data?.isTest !== undefined ? node?.data?.isTest : true,
        isPinned: node?.data?.isPinned || false,
      };
    },
    shallow
  );
  
  // Use refs to track previous values and only update when content actually changes
  // This prevents infinite loops when arrays are recreated with same content
  const edgesRef = useRef(edgesRaw);
  const nodesRef = useRef(nodesRaw);
  const edgesIdsRef = useRef<string>('');
  const nodesIdsRef = useRef<string>('');
  
  // Compare by content (IDs) rather than reference
  const currentEdgesIds = edgesRaw.map(e => `${e.id || e.source}-${e.target}`).join(',');
  const currentNodesIds = nodesRaw.map(n => n.id).join(',');
  
  const edgesChanged = edgesIdsRef.current !== currentEdgesIds;
  const nodesChanged = nodesIdsRef.current !== currentNodesIds;
  
  if (edgesChanged) {
    edgesRef.current = edgesRaw;
    edgesIdsRef.current = currentEdgesIds;
  }
  if (nodesChanged) {
    nodesRef.current = nodesRaw;
    nodesIdsRef.current = currentNodesIds;
  }
  
  // Use stable references that only change when content changes
  const edges = edgesRef.current;
  const nodes = nodesRef.current;
  
  // Memoize only the edges connected to this node
  const edgesForThisNode = useMemo(() => 
    edges.filter(e => e.target === id || e.source === id),
    [edges, id]
  );
  // Memoize only the nodes that are sources of edges connected to this node
  const sourceNodeIds = useMemo(() => 
    new Set(edgesForThisNode.map(e => e.source).filter(Boolean)),
    [edgesForThisNode]
  );
  const sourceNodes = useMemo(() =>
    nodes.filter(n => sourceNodeIds.has(n.id)),
    [nodes, sourceNodeIds]
  );
  const failedNodes = useWorkflowStore((state) => state.failedNodes);
  const validationErrors = useWorkflowStore((state) => state.validationErrors);
  const executingNodeId = useWorkflowStore((state) => state.executingNodeId);
  const showErrorPopupForNode = useWorkflowStore((state) => state.showErrorPopupForNode);
  const isFailed = failedNodes.has(id);
  const hasValidationError = validationErrors.has(id);
  // Read isExecuting directly from store instead of node data to avoid triggering ReactFlow sync
  const isExecuting = executingNodeId === id;

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(label);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const selectConfigFileInputRef = useRef<HTMLInputElement>(null);
  const [connectingHandleId, setConnectingHandleId] = useState<string | null>(null);
  
  // Check if this handle has an incoming/outgoing connection
  const hasDriverConnection = edgesRaw.some(e => e.target === id && e.targetHandle === 'driver');
  const hasOutputConnection = edgesRaw.some(e => e.source === id && e.sourceHandle === 'output');
  
  // Check if this is a switch node
  const isSwitchNode = nodeType === 'switch.switch';
  
  // Check if this is a reusable node
  const isReusableNode = nodeType === 'reusable.reusable';
  const isEndNode = nodeType === 'reusable.end';
  const isRunReusableNode = nodeType === 'reusable.runReusable';
  const switchCases = isSwitchNode ? (renderData.cases || []) : [];
  const switchDefaultCase = isSwitchNode ? (renderData.defaultCase || { label: 'Default' }) : null;
  
  // Check if this is a utility node (no handles)
  const isCommentBox = nodeType === 'comment-box.comment';
  const isShortcut = nodeType === 'shortcut.shortcut';
  const isUtilityNode = isCommentBox || isShortcut;
  
  const currentWidth = width || stableData.width || 200;
  const currentHeight = height || stableData.height || undefined;
  // Use node-specific data from store selector to ensure we always get latest values
  // This avoids ReactFlow sync delays and ensures immediate updates
  const isMinimized = nodeDataFromStore.isMinimized;
  const bypass = nodeDataFromStore.bypass;
  const failSilently = nodeDataFromStore.failSilently;
  const isPinned = nodeDataFromStore.isPinned ?? false;
  // Use custom background color if set, otherwise use default
  // Read directly from data prop (not stableData) to get real-time updates
  // Also check latestNodeData to ensure we have the most recent value
  const backgroundColor = latestNodeData.backgroundColor || data.backgroundColor || '#1f2937';
  
  // Calculate optimal text color based on background color for contrast
  // In light theme, use theme text color for better visibility
  const textColor = theme === 'light' 
    ? '#1F2937' // Use dark grey for light theme
    : getContrastTextColor(backgroundColor);
  // Check if node is search highlighted
  const isSearchHighlighted = latestNodeData.searchHighlighted === true;
  // Border color: red if failed, blue if selected, orange/yellow if search highlighted, default gray otherwise
  const borderColor = isFailed ? '#ef4444' : (selected ? '#3b82f6' : (isSearchHighlighted ? '#f59e0b' : '#4b5563'));

  // Calculate minimum dimensions based on content
  const calculateMinDimensions = useCallback(() => {
    // Minimum width: enough for label + icon + padding
    // Estimate label width: ~8px per character + icon (~24px) + padding (32px total)
    const labelWidth = (label.length * 8) + 24 + 32;
    
    // Calculate width needed for properties
    let maxPropertyWidth = 0;
    let hasProps = false;
    let propertyCount = 0;
    
    if (Object.values(NodeType).includes(nodeType as NodeType)) {
      // Built-in nodes - get properties from schema
      const properties = getNodeProperties(nodeType);
      hasProps = properties.length > 0;
      propertyCount = properties.length;
      
      // Calculate width for each property
      properties.forEach(prop => {
        // Skip properties that are converted to inputs (they show connection info, not values)
        const isInput = isPropertyInputConnection(data, prop.name);
        if (isInput) {
          // For inputs, estimate width based on label only (connection info is shorter)
          const inputWidth = (prop.label.length * 8) + 60 + 16; // label + min-w-[60px] + padding
          maxPropertyWidth = Math.max(maxPropertyWidth, inputWidth);
        } else {
          // Get property value from data
          const propValue = data[prop.name];
          let valueStr = '';
          
          if (propValue !== undefined && propValue !== null) {
            if (prop.dataType === PropertyDataType.STRING) {
              valueStr = String(propValue);
              // For long strings (like URLs or code), consider first line or reasonable max
              // This helps prevent extremely wide nodes from very long single-line values
              if (valueStr.length > 100 && !valueStr.includes('\n')) {
                valueStr = valueStr.substring(0, 100);
              } else if (valueStr.includes('\n')) {
                // For multi-line strings, use first line for width calculation
                const firstLine = valueStr.split('\n')[0];
                valueStr = firstLine.length > 100 ? firstLine.substring(0, 100) : firstLine;
              }
            } else if (prop.dataType === PropertyDataType.INT || prop.dataType === PropertyDataType.FLOAT || prop.dataType === PropertyDataType.DOUBLE) {
              valueStr = String(propValue);
            } else if (prop.dataType === PropertyDataType.BOOLEAN) {
              valueStr = String(propValue);
            } else {
              valueStr = String(propValue);
            }
          }
          
          // Calculate width: label length + value length * 8px + label min-width (60px) + padding (16px) + gaps (8px)
          const propertyWidth = (prop.label.length + valueStr.length) * 8 + 60 + 16 + 8;
          maxPropertyWidth = Math.max(maxPropertyWidth, propertyWidth);
        }
      });
    } else {
      // Plugin nodes
      const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
      hasProps = !!(pluginNode && pluginNode.definition.defaultData !== undefined);
      if (hasProps && pluginNode?.definition.defaultData) {
        const properties = Object.keys(pluginNode.definition.defaultData);
        propertyCount = properties.length;
        
        // Calculate width for each plugin property
        properties.forEach(propName => {
          const propValue = data[propName] ?? pluginNode.definition.defaultData![propName];
          const valueStr = propValue !== undefined && propValue !== null ? String(propValue) : '';
          
          // Use property name as label (plugin nodes use name as label)
          const propertyWidth = (propName.length + valueStr.length) * 8 + 60 + 16 + 8;
          maxPropertyWidth = Math.max(maxPropertyWidth, propertyWidth);
        });
      }
    }
    
    // Minimum width is max of: label width, max property width, or 150px
    const minWidth = Math.max(150, labelWidth, maxPropertyWidth);
    
    // Minimum height: header (~50px) + properties if not minimized
    let minHeight = 50; // Header height
    if (!isMinimized && hasProps && propertyCount > 0) {
      minHeight += propertyCount * 32 + 16; // Properties + border + padding
    }
    
    return { minWidth, minHeight };
  }, [label, isMinimized, data, nodeType]);

  const handleResize = useCallback((deltaX: number, deltaY: number) => {
    const { minWidth, minHeight } = calculateMinDimensions();
    const newWidth = Math.max(minWidth, currentWidth + deltaX);
    const newHeight = currentHeight ? Math.max(minHeight, currentHeight + deltaY) : undefined;
    updateNodeDimensions(id, newWidth, newHeight);
  }, [id, currentWidth, currentHeight, updateNodeDimensions, calculateMinDimensions]);

  // Update node dimensions when minimized state changes to ensure visual update
  const prevIsMinimizedRef = useRef(isMinimized);
  useEffect(() => {
    if (prevIsMinimizedRef.current !== isMinimized) {
      const { minWidth, minHeight } = calculateMinDimensions();
      // When minimizing, set height to minimum. When maximizing, let it auto-resize
      if (isMinimized) {
        updateNodeDimensions(id, Math.max(minWidth, currentWidth), minHeight);
      } else {
        // When maximizing, remove explicit height to allow auto-sizing
        updateNodeDimensions(id, Math.max(minWidth, currentWidth), undefined);
      }
      prevIsMinimizedRef.current = isMinimized;
    }
  }, [isMinimized, id, currentWidth, currentHeight, calculateMinDimensions, updateNodeDimensions]);

  const handleDoubleClickHeader = useCallback(() => {
    setIsRenaming(true);
    setRenameValue(label);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  }, [label]);

  const handleRenameSubmit = useCallback(() => {
    if (renameValue.trim() && renameValue !== label) {
      renameNode(id, renameValue.trim());
    } else {
      setRenameValue(label);
    }
    setIsRenaming(false);
  }, [id, renameValue, label, renameNode]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameValue(label);
      setIsRenaming(false);
    }
  }, [handleRenameSubmit, label]);

  const handleBoundaryDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    autoResizeNode(id);
  }, [id, autoResizeNode]);

  const handlePropertyChange = useCallback((field: string, value: any) => {
    updateNodeData(id, { [field]: value });
  }, [id, updateNodeData]);

  // Handler to open property editor popup
  const handleOpenPopup = useCallback((
    type: PropertyEditorType,
    label: string,
    value: any,
    onChange: (value: any) => void,
    placeholder?: string,
    min?: number,
    max?: number,
    field?: string // Optional field name to read latest value
  ) => {
    setPropertyPopup({
      type,
      label,
      field: field || label.toLowerCase().replace(/\s+/g, ''), // Default to label-based field name
      value,
      onChange,
      placeholder,
      min,
      max,
    });
  }, []);

  // Helper to check if property is converted to input
  const isPropertyInput = useCallback((propertyName: string) => {
    return isPropertyInputConnection(renderData, propertyName);
  }, [renderData]);

  // Helper to render property with conditional input handle
  const renderPropertyRow = useCallback((propertyName: string, propertyElement: React.ReactNode, _propertyIndex: number) => {
    const isInput = isPropertyInput(propertyName);
    const handleId = getPropertyInputHandleId(propertyName);
    // Use filtered edges instead of full edges array
    const connectedEdge = edgesForThisNode.find(e => e.target === id && e.targetHandle === handleId);
    const hasConnection = !!connectedEdge;
    const propertySchema = getNodeProperties(nodeType).find(p => p.name === propertyName);
    const isRequired = propertySchema?.required || false;
    
    // Get source node info if connected - use filtered nodes instead of full nodes array
    const sourceNode = hasConnection && connectedEdge 
      ? sourceNodes.find(n => n.id === connectedEdge.source)
      : null;
    const sourceNodeLabel = sourceNode?.data?.label || sourceNode?.data?.type || connectedEdge?.source;

    return (
      <div key={propertyName} className="relative flex items-center gap-2 min-h-[24px] min-w-0">
        {/* Property input handle */}
        {isInput && (
          <>
            <Handle
              type="target"
              position={Position.Left}
              id={handleId}
              className={`transition-all duration-200 w-3 h-3 ${
                connectingHandleId === handleId
                  ? 'connecting'
                  : hasConnection
                    ? 'handle-connected'
                    : ''
              }`}
              style={{
                position: 'absolute',
                left: '-6px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderColor: connectingHandleId === handleId
                  ? '#22c55e'
                  : hasConnection
                    ? '#22c55e'
                    : isRequired && !hasConnection
                      ? '#eab308'
                      : '#4a9eff',
              }}
              onMouseEnter={() => setConnectingHandleId(handleId)}
              onMouseLeave={() => setConnectingHandleId(null)}
            />
            <span className="text-xs ml-2 flex-shrink-0 flex items-center gap-1" style={{ color: textColor, opacity: 0.7 }}>
              <span className="text-blue-400">→</span>
              {propertySchema?.label || propertyName}
            </span>
          </>
        )}
        {/* Property editor - hide if converted to input */}
        {!isInput && (
          <div className="flex-1 min-w-0">
            {React.isValidElement(propertyElement) 
              ? React.cloneElement(propertyElement as React.ReactElement<any>, { field: propertyName })
              : propertyElement}
          </div>
        )}
        {isInput && (
          <div className={`flex-1 text-xs min-w-0 ${!hasConnection ? 'italic' : ''}`} style={{ color: textColor, opacity: theme === 'light' ? 1 : (hasConnection ? 0.9 : 0.6) }}>
            {hasConnection ? (
              <span className="flex items-center gap-1 min-w-0">
                <span className="text-green-400 flex-shrink-0">●</span>
                <span className="truncate min-w-0" title={sourceNodeLabel}>{sourceNodeLabel}</span>
              </span>
            ) : (
              <span>Not connected</span>
            )}
          </div>
        )}
      </div>
    );
  }, [id, edgesForThisNode, sourceNodes, isPropertyInput, connectingHandleId, nodeType, setConnectingHandleId, textColor, theme]);

  const renderProperties = () => {
    if (Object.values(NodeType).includes(nodeType as NodeType)) {
      switch (nodeType as NodeType) {
        case NodeType.START:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('recordSession', (
                <InlineCheckbox
                  label="Record Session"
                  value={renderData.recordSession || false}
                  onChange={(value) => handlePropertyChange('recordSession', value)}
                />
              ), 0)}
              {renderPropertyRow('screenshotAllNodes', (
                <InlineCheckbox
                  label="Screenshot All Nodes"
                  value={renderData.screenshotAllNodes || false}
                  onChange={(value) => handlePropertyChange('screenshotAllNodes', value)}
                />
              ), 1)}
              {renderData.screenshotAllNodes && renderPropertyRow('screenshotTiming', (
                <InlineSelect
                  label="Screenshot Timing"
                  value={renderData.screenshotTiming || 'post'}
                  onChange={(value) => handlePropertyChange('screenshotTiming', value)}
                  options={[
                    { label: 'Pre', value: 'pre' },
                    { label: 'Post', value: 'post' },
                    { label: 'Both', value: 'both' },
                  ]}
                />
              ), 2)}
            </div>
          );
        
        case NodeType.ACTION:
          const action = renderData.action || 'click';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={action}
                  onChange={(value) => {
                    handlePropertyChange('action', value);
                    // Clear action-specific properties when action changes
                    if (value !== 'click' && value !== 'rightClick') {
                      handlePropertyChange('button', undefined);
                    }
                    if (value !== 'hover' && value !== 'doubleClick') {
                      handlePropertyChange('delay', undefined);
                    }
                  }}
                  options={[
                    { label: 'Click', value: 'click' },
                    { label: 'Double Click', value: 'doubleClick' },
                    { label: 'Right Click', value: 'rightClick' },
                    { label: 'Hover', value: 'hover' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('selectorType', (
                <InlineSelect
                  label="Selector Type"
                  value={renderData.selectorType || 'css'}
                  onChange={(value) => handlePropertyChange('selectorType', value)}
                  options={[
                    { label: 'CSS', value: 'css' },
                    { label: 'XPath', value: 'xpath' },
                  ]}
                />
              ), 1)}
              {renderPropertyRow('selector', (
                <InlineTextInput
                  label="Selector"
                  value={renderData.selector || ''}
                  onChange={(value) => handlePropertyChange('selector', value)}
                  placeholder="#button or //button[@id='button']"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {(action === 'click' || action === 'rightClick') && renderPropertyRow('button', (
                <InlineSelect
                  label="Button"
                  value={renderData.button || 'left'}
                  onChange={(value) => handlePropertyChange('button', value)}
                  options={[
                    { label: 'Left', value: 'left' },
                    { label: 'Right', value: 'right' },
                    { label: 'Middle', value: 'middle' },
                  ]}
                />
              ), 3)}
              {(action === 'hover' || action === 'doubleClick') && renderPropertyRow('delay', (
                <InlineNumberInput
                  label="Delay (ms)"
                  value={renderData.delay || 0}
                  onChange={(value) => handlePropertyChange('delay', value)}
                  placeholder="0"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 4)}
              {renderData.waitForSelector && renderPropertyRow('waitForSelector', (
                <InlineTextInput
                  label="Wait Selector"
                  value={renderData.waitForSelector || ''}
                  onChange={(value) => handlePropertyChange('waitForSelector', value)}
                  placeholder=".my-class"
                  onOpenPopup={handleOpenPopup}
                />
              ), 5)}
              {renderData.waitForSelector && renderPropertyRow('waitForSelectorType', (
                <InlineSelect
                  label="Wait Selector Type"
                  value={renderData.waitForSelectorType || 'css'}
                  onChange={(value) => handlePropertyChange('waitForSelectorType', value)}
                  options={[
                    { label: 'CSS', value: 'css' },
                    { label: 'XPath', value: 'xpath' },
                  ]}
                />
              ), 6)}
              {renderData.waitForUrl && renderPropertyRow('waitForUrl', (
                <InlineTextInput
                  label="Wait URL"
                  value={renderData.waitForUrl || ''}
                  onChange={(value) => handlePropertyChange('waitForUrl', value)}
                  placeholder="/pattern/ or exact-url"
                  onOpenPopup={handleOpenPopup}
                />
              ), 7)}
              {renderData.waitForCondition && renderPropertyRow('waitForCondition', (
                <InlineTextarea
                  label="Wait Condition"
                  value={renderData.waitForCondition || ''}
                  onChange={(value) => handlePropertyChange('waitForCondition', value)}
                  placeholder="() => document.querySelector('.loaded')"
                  onOpenPopup={handleOpenPopup}
                />
              ), 8)}
              {(renderData.waitForSelector || renderData.waitForUrl || renderData.waitForCondition) && renderPropertyRow('waitStrategy', (
                <InlineSelect
                  label="Wait Strategy"
                  value={renderData.waitStrategy || 'parallel'}
                  onChange={(value) => handlePropertyChange('waitStrategy', value)}
                  options={[
                    { label: 'Parallel', value: 'parallel' },
                    { label: 'Sequential', value: 'sequential' },
                  ]}
                />
              ), 9)}
              {renderData.retryEnabled && renderPropertyRow('retryStrategy', (
                <InlineSelect
                  label="Retry Strategy"
                  value={renderData.retryStrategy || 'count'}
                  onChange={(value) => handlePropertyChange('retryStrategy', value)}
                  options={[
                    { label: 'Count', value: 'count' },
                    { label: 'Until Condition', value: 'untilCondition' },
                  ]}
                />
              ), 10)}
              {renderData.retryEnabled && renderData.retryStrategy === 'count' && renderPropertyRow('retryCount', (
                <InlineNumberInput
                  label="Retry Count"
                  value={renderData.retryCount || 3}
                  onChange={(value) => handlePropertyChange('retryCount', value)}
                  placeholder="3"
                  onOpenPopup={handleOpenPopup}
                />
              ), 11)}
            </div>
          );
        
        case NodeType.ELEMENT_QUERY:
          const elementQueryAction = renderData.action || 'getText';
          const getDefaultOutputVar = (actionType: string): string => {
            switch (actionType) {
              case 'getText':
              case 'getAllText':
                return 'text';
              case 'getAttribute':
                return 'attribute';
              case 'getCount':
                return 'count';
              case 'isVisible':
                return 'isVisible';
              case 'isEnabled':
                return 'isEnabled';
              case 'isChecked':
                return 'isChecked';
              case 'getBoundingBox':
                return 'boundingBox';
              default:
                return 'result';
            }
          };
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={elementQueryAction}
                  onChange={(value) => {
                    handlePropertyChange('action', value);
                    // Clear action-specific properties when action changes
                    if (value !== 'getAttribute') {
                      handlePropertyChange('attributeName', undefined);
                    }
                    // Set default output variable
                    handlePropertyChange('outputVariable', getDefaultOutputVar(value));
                  }}
                  options={[
                    { label: 'Get Text', value: 'getText' },
                    { label: 'Get Attribute', value: 'getAttribute' },
                    { label: 'Get Count', value: 'getCount' },
                    { label: 'Is Visible', value: 'isVisible' },
                    { label: 'Is Enabled', value: 'isEnabled' },
                    { label: 'Is Checked', value: 'isChecked' },
                    { label: 'Get Bounding Box', value: 'getBoundingBox' },
                    { label: 'Get All Text', value: 'getAllText' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('selectorType', (
                <InlineSelect
                  label="Selector Type"
                  value={renderData.selectorType || 'css'}
                  onChange={(value) => handlePropertyChange('selectorType', value)}
                  options={[
                    { label: 'CSS', value: 'css' },
                    { label: 'XPath', value: 'xpath' },
                  ]}
                />
              ), 1)}
              {renderPropertyRow('selector', (
                <InlineTextInput
                  label="Selector"
                  value={renderData.selector || ''}
                  onChange={(value) => handlePropertyChange('selector', value)}
                  placeholder="#element or //div[@class='text']"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {elementQueryAction === 'getAttribute' && renderPropertyRow('attributeName', (
                <InlineTextInput
                  label="Attribute Name"
                  value={renderData.attributeName || ''}
                  onChange={(value) => handlePropertyChange('attributeName', value)}
                  placeholder="id, class, href, etc."
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
              {renderPropertyRow('outputVariable', (
                <InlineTextInput
                  label="Output Variable"
                  value={renderData.outputVariable || getDefaultOutputVar(elementQueryAction)}
                  onChange={(value) => handlePropertyChange('outputVariable', value)}
                  placeholder={getDefaultOutputVar(elementQueryAction)}
                  onOpenPopup={handleOpenPopup}
                />
              ), 4)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 5)}
            </div>
          );
        
        case NodeType.FORM_INPUT:
          const formInputAction = renderData.action || 'select';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={formInputAction}
                  onChange={(value) => {
                    handlePropertyChange('action', value);
                    // Clear action-specific properties when action changes
                    if (value !== 'select') {
                      handlePropertyChange('values', undefined);
                      handlePropertyChange('selectBy', undefined);
                      handlePropertyChange('multiple', undefined);
                    }
                    if (value !== 'check' && value !== 'uncheck') {
                      handlePropertyChange('force', undefined);
                    }
                    if (value !== 'upload') {
                      handlePropertyChange('filePaths', undefined);
                      handlePropertyChange('multiple', undefined);
                    }
                  }}
                  options={[
                    { label: 'Select', value: 'select' },
                    { label: 'Check', value: 'check' },
                    { label: 'Uncheck', value: 'uncheck' },
                    { label: 'Upload', value: 'upload' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('selectorType', (
                <InlineSelect
                  label="Selector Type"
                  value={renderData.selectorType || 'css'}
                  onChange={(value) => handlePropertyChange('selectorType', value)}
                  options={[
                    { label: 'CSS', value: 'css' },
                    { label: 'XPath', value: 'xpath' },
                  ]}
                />
              ), 1)}
              {renderPropertyRow('selector', (
                <InlineTextInput
                  label="Selector"
                  value={renderData.selector || ''}
                  onChange={(value) => handlePropertyChange('selector', value)}
                  placeholder="#select or //select[@id='select']"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {formInputAction === 'select' && renderPropertyRow('values', (
                <InlineTextInput
                  label="Values"
                  value={Array.isArray(renderData.values) ? renderData.values.join(', ') : (renderData.values || '')}
                  onChange={(value) => {
                    // Handle comma-separated or single value
                    const values = value.includes(',') ? value.split(',').map((v: string) => v.trim()) : value;
                    handlePropertyChange('values', values);
                  }}
                  placeholder="option1, option2"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
              {formInputAction === 'upload' && renderPropertyRow('filePaths', (
                <InlineTextInput
                  label="File Paths"
                  value={Array.isArray(renderData.filePaths) ? renderData.filePaths.join(', ') : (renderData.filePaths || '')}
                  onChange={(value) => {
                    // Handle comma-separated or single value
                    const paths = value.includes(',') ? value.split(',').map((p: string) => p.trim()) : value;
                    handlePropertyChange('filePaths', paths);
                  }}
                  placeholder="/path/to/file.txt"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 4)}
            </div>
          );
        
        case NodeType.NAVIGATION:
          const navAction = renderData.action || 'navigate';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={navAction}
                  onChange={(value) => {
                    handlePropertyChange('action', value);
                    // Clear action-specific properties when action changes
                    if (value !== 'navigate' && value !== 'newTab') {
                      handlePropertyChange('url', undefined);
                    }
                    if (value !== 'navigate') {
                      handlePropertyChange('referer', undefined);
                    }
                    if (value !== 'navigate' && value !== 'goBack' && value !== 'goForward' && value !== 'reload') {
                      handlePropertyChange('waitUntil', undefined);
                    }
                    if (value !== 'switchTab') {
                      handlePropertyChange('tabIndex', undefined);
                      handlePropertyChange('urlPattern', undefined);
                    }
                    if (value !== 'closeTab') {
                      handlePropertyChange('tabIndex', undefined);
                    }
                  }}
                  options={[
                    { label: 'Navigate', value: 'navigate' },
                    { label: 'Go Back', value: 'goBack' },
                    { label: 'Go Forward', value: 'goForward' },
                    { label: 'Reload', value: 'reload' },
                    { label: 'New Tab', value: 'newTab' },
                    { label: 'Switch Tab', value: 'switchTab' },
                    { label: 'Close Tab', value: 'closeTab' },
                  ]}
                />
              ), 0)}
              {(navAction === 'navigate' || navAction === 'newTab') && renderPropertyRow('url', (
                <InlineTextInput
                  label="URL"
                  value={renderData.url || ''}
                  onChange={(value) => handlePropertyChange('url', value)}
                  placeholder="https://example.com"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {navAction === 'navigate' && renderPropertyRow('referer', (
                <InlineTextInput
                  label="Referer"
                  value={renderData.referer || ''}
                  onChange={(value) => handlePropertyChange('referer', value)}
                  placeholder="https://referer.com"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {(navAction === 'navigate' || navAction === 'goBack' || navAction === 'goForward' || navAction === 'reload') && renderPropertyRow('waitUntil', (
                <InlineSelect
                  label="Wait Until"
                  value={renderData.waitUntil || 'networkidle'}
                  onChange={(value) => handlePropertyChange('waitUntil', value)}
                  options={[
                    { label: 'Load', value: 'load' },
                    { label: 'DOMContentLoaded', value: 'domcontentloaded' },
                    { label: 'Network Idle', value: 'networkidle' },
                    { label: 'Commit', value: 'commit' },
                  ]}
                />
              ), 3)}
              {navAction === 'switchTab' && renderPropertyRow('tabIndex', (
                <InlineNumberInput
                  label="Tab Index"
                  value={renderData.tabIndex !== undefined ? renderData.tabIndex : ''}
                  onChange={(value) => handlePropertyChange('tabIndex', value !== '' ? value : undefined)}
                  placeholder="Leave empty for URL pattern"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
              {navAction === 'switchTab' && renderPropertyRow('urlPattern', (
                <InlineTextInput
                  label="URL Pattern"
                  value={renderData.urlPattern || ''}
                  onChange={(value) => handlePropertyChange('urlPattern', value)}
                  placeholder="/example\.com/ or example.com"
                  onOpenPopup={handleOpenPopup}
                />
              ), 4)}
              {navAction === 'closeTab' && renderPropertyRow('tabIndex', (
                <InlineNumberInput
                  label="Tab Index"
                  value={renderData.tabIndex !== undefined ? renderData.tabIndex : ''}
                  onChange={(value) => handlePropertyChange('tabIndex', value !== '' ? value : undefined)}
                  placeholder="Leave empty for current tab"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 5)}
            </div>
          );
        
        case NodeType.KEYBOARD:
          const keyboardAction = renderData.action || 'press';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={keyboardAction}
                  onChange={(value) => {
                    handlePropertyChange('action', value);
                    if (value !== 'press' && value !== 'down' && value !== 'up') {
                      handlePropertyChange('key', undefined);
                    }
                    if (value !== 'type' && value !== 'insertText') {
                      handlePropertyChange('text', undefined);
                    }
                    if (value !== 'shortcut') {
                      handlePropertyChange('shortcut', undefined);
                    }
                  }}
                  options={[
                    { label: 'Press', value: 'press' },
                    { label: 'Type', value: 'type' },
                    { label: 'Insert Text', value: 'insertText' },
                    { label: 'Shortcut', value: 'shortcut' },
                    { label: 'Hold Down', value: 'down' },
                    { label: 'Release', value: 'up' },
                  ]}
                />
              ), 0)}
              {(keyboardAction === 'press' || keyboardAction === 'down' || keyboardAction === 'up') && renderPropertyRow('key', (
                <InlineTextInput
                  label="Key"
                  value={renderData.key || ''}
                  onChange={(value) => handlePropertyChange('key', value)}
                  placeholder="Enter, Tab"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {(keyboardAction === 'type' || keyboardAction === 'insertText') && renderPropertyRow('text', (
                <InlineTextarea
                  label="Text"
                  value={renderData.text || ''}
                  onChange={(value) => handlePropertyChange('text', value)}
                  placeholder="Text to type"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {keyboardAction === 'shortcut' && renderPropertyRow('shortcut', (
                <InlineTextInput
                  label="Shortcut"
                  value={renderData.shortcut || ''}
                  onChange={(value) => handlePropertyChange('shortcut', value)}
                  placeholder="Control+C"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
            </div>
          );
        
        case NodeType.SCROLL:
          const scrollAction = renderData.action || 'scrollToElement';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={scrollAction}
                  onChange={(value) => {
                    handlePropertyChange('action', value);
                    if (value !== 'scrollToElement') {
                      handlePropertyChange('selector', undefined);
                    }
                    if (value !== 'scrollToPosition') {
                      handlePropertyChange('x', undefined);
                      handlePropertyChange('y', undefined);
                    }
                    if (value !== 'scrollBy') {
                      handlePropertyChange('deltaX', undefined);
                      handlePropertyChange('deltaY', undefined);
                    }
                  }}
                  options={[
                    { label: 'To Element', value: 'scrollToElement' },
                    { label: 'To Position', value: 'scrollToPosition' },
                    { label: 'By', value: 'scrollBy' },
                    { label: 'To Top', value: 'scrollToTop' },
                    { label: 'To Bottom', value: 'scrollToBottom' },
                  ]}
                />
              ), 0)}
              {scrollAction === 'scrollToElement' && renderPropertyRow('selector', (
                <InlineTextInput
                  label="Selector"
                  value={renderData.selector || ''}
                  onChange={(value) => handlePropertyChange('selector', value)}
                  placeholder="#element"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {scrollAction === 'scrollToPosition' && (
                <>
                  {renderPropertyRow('x', (
                    <InlineNumberInput
                      label="X"
                      value={renderData.x || 0}
                      onChange={(value) => handlePropertyChange('x', value)}
                      placeholder="0"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 1)}
                  {renderPropertyRow('y', (
                    <InlineNumberInput
                      label="Y"
                      value={renderData.y || 0}
                      onChange={(value) => handlePropertyChange('y', value)}
                      placeholder="0"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 2)}
                </>
              )}
              {scrollAction === 'scrollBy' && (
                <>
                  {renderPropertyRow('deltaX', (
                    <InlineNumberInput
                      label="Delta X"
                      value={renderData.deltaX || 0}
                      onChange={(value) => handlePropertyChange('deltaX', value)}
                      placeholder="0"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 1)}
                  {renderPropertyRow('deltaY', (
                    <InlineNumberInput
                      label="Delta Y"
                      value={renderData.deltaY || 0}
                      onChange={(value) => handlePropertyChange('deltaY', value)}
                      placeholder="0"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 2)}
                </>
              )}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
            </div>
          );
        
        case NodeType.TYPE:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('selectorType', (
                <InlineSelect
                  label="Selector Type"
                  value={renderData.selectorType || 'css'}
                  onChange={(value) => handlePropertyChange('selectorType', value)}
                  options={[
                    { label: 'CSS', value: 'css' },
                    { label: 'XPath', value: 'xpath' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('selector', (
                <InlineTextInput
                  label="Selector"
                  value={renderData.selector || ''}
                  onChange={(value) => handlePropertyChange('selector', value)}
                  placeholder="#input or //input[@id='input']"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {renderPropertyRow('text', (
                <InlineTextarea
                  label="Text"
                  value={renderData.text || ''}
                  onChange={(value) => handlePropertyChange('text', value)}
                  placeholder="Text to type"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
              {renderData.waitForSelector && renderPropertyRow('waitForSelector', (
                <InlineTextInput
                  label="Wait Selector"
                  value={renderData.waitForSelector || ''}
                  onChange={(value) => handlePropertyChange('waitForSelector', value)}
                  placeholder=".my-class"
                  onOpenPopup={handleOpenPopup}
                />
              ), 4)}
              {renderData.waitForSelector && renderPropertyRow('waitForSelectorType', (
                <InlineSelect
                  label="Wait Selector Type"
                  value={renderData.waitForSelectorType || 'css'}
                  onChange={(value) => handlePropertyChange('waitForSelectorType', value)}
                  options={[
                    { label: 'CSS', value: 'css' },
                    { label: 'XPath', value: 'xpath' },
                  ]}
                />
              ), 5)}
              {renderData.waitForUrl && renderPropertyRow('waitForUrl', (
                <InlineTextInput
                  label="Wait URL"
                  value={renderData.waitForUrl || ''}
                  onChange={(value) => handlePropertyChange('waitForUrl', value)}
                  placeholder="/pattern/ or exact-url"
                  onOpenPopup={handleOpenPopup}
                />
              ), 6)}
              {renderData.waitForCondition && renderPropertyRow('waitForCondition', (
                <InlineTextarea
                  label="Wait Condition"
                  value={renderData.waitForCondition || ''}
                  onChange={(value) => handlePropertyChange('waitForCondition', value)}
                  placeholder="() => document.querySelector('.loaded')"
                  onOpenPopup={handleOpenPopup}
                />
              ), 7)}
              {(renderData.waitForSelector || renderData.waitForUrl || renderData.waitForCondition) && renderPropertyRow('waitStrategy', (
                <InlineSelect
                  label="Wait Strategy"
                  value={renderData.waitStrategy || 'parallel'}
                  onChange={(value) => handlePropertyChange('waitStrategy', value)}
                  options={[
                    { label: 'Parallel', value: 'parallel' },
                    { label: 'Sequential', value: 'sequential' },
                  ]}
                />
              ), 8)}
              {renderData.retryEnabled && renderPropertyRow('retryStrategy', (
                <InlineSelect
                  label="Retry Strategy"
                  value={renderData.retryStrategy || 'count'}
                  onChange={(value) => handlePropertyChange('retryStrategy', value)}
                  options={[
                    { label: 'Count', value: 'count' },
                    { label: 'Until Condition', value: 'untilCondition' },
                  ]}
                />
              ), 9)}
              {renderData.retryEnabled && renderData.retryStrategy === 'count' && renderPropertyRow('retryCount', (
                <InlineNumberInput
                  label="Retry Count"
                  value={renderData.retryCount || 3}
                  onChange={(value) => handlePropertyChange('retryCount', value)}
                  placeholder="3"
                  onOpenPopup={handleOpenPopup}
                />
              ), 10)}
            </div>
          );
        
        case NodeType.SCREENSHOT:
          const screenshotAction = renderData.action || (renderData.fullPage ? 'fullPage' : 'viewport');
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={screenshotAction}
                  onChange={(value) => {
                    handlePropertyChange('action', value);
                    if (value !== 'element') {
                      handlePropertyChange('selector', undefined);
                    }
                    if (value !== 'pdf') {
                      handlePropertyChange('format', undefined);
                    }
                    // Legacy: update fullPage
                    handlePropertyChange('fullPage', value === 'fullPage');
                  }}
                  options={[
                    { label: 'Full Page', value: 'fullPage' },
                    { label: 'Viewport', value: 'viewport' },
                    { label: 'Element', value: 'element' },
                    { label: 'PDF', value: 'pdf' },
                  ]}
                />
              ), 0)}
              {screenshotAction === 'element' && renderPropertyRow('selector', (
                <InlineTextInput
                  label="Selector"
                  value={renderData.selector || ''}
                  onChange={(value) => handlePropertyChange('selector', value)}
                  placeholder="#element"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {/* Legacy: Keep fullPage checkbox for backward compatibility */}
              {!renderData.action && renderPropertyRow('fullPage', (
                <InlineCheckbox
                  label="Full Page"
                  value={renderData.fullPage || false}
                  onChange={(value) => {
                    handlePropertyChange('fullPage', value);
                    handlePropertyChange('action', value ? 'fullPage' : 'viewport');
                  }}
                />
              ), 1)}
              {renderPropertyRow('path', (
                <InlineTextInput
                  label="Path"
                  value={renderData.path || ''}
                  onChange={(value) => handlePropertyChange('path', value)}
                  placeholder="screenshot.png (optional)"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {renderData.waitForSelector && renderPropertyRow('waitForSelector', (
                <InlineTextInput
                  label="Wait Selector"
                  value={renderData.waitForSelector || ''}
                  onChange={(value) => handlePropertyChange('waitForSelector', value)}
                  placeholder=".my-class"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {renderData.waitForSelector && renderPropertyRow('waitForSelectorType', (
                <InlineSelect
                  label="Wait Selector Type"
                  value={renderData.waitForSelectorType || 'css'}
                  onChange={(value) => handlePropertyChange('waitForSelectorType', value)}
                  options={[
                    { label: 'CSS', value: 'css' },
                    { label: 'XPath', value: 'xpath' },
                  ]}
                />
              ), 3)}
              {renderData.waitForUrl && renderPropertyRow('waitForUrl', (
                <InlineTextInput
                  label="Wait URL"
                  value={renderData.waitForUrl || ''}
                  onChange={(value) => handlePropertyChange('waitForUrl', value)}
                  placeholder="/pattern/ or exact-url"
                  onOpenPopup={handleOpenPopup}
                />
              ), 4)}
              {renderData.waitForCondition && renderPropertyRow('waitForCondition', (
                <InlineTextarea
                  label="Wait Condition"
                  value={renderData.waitForCondition || ''}
                  onChange={(value) => handlePropertyChange('waitForCondition', value)}
                  placeholder="() => document.querySelector('.loaded')"
                  onOpenPopup={handleOpenPopup}
                />
              ), 5)}
              {(renderData.waitForSelector || renderData.waitForUrl || renderData.waitForCondition) && renderPropertyRow('waitStrategy', (
                <InlineSelect
                  label="Wait Strategy"
                  value={renderData.waitStrategy || 'parallel'}
                  onChange={(value) => handlePropertyChange('waitStrategy', value)}
                  options={[
                    { label: 'Parallel', value: 'parallel' },
                    { label: 'Sequential', value: 'sequential' },
                  ]}
                />
              ), 6)}
              {renderData.retryEnabled && renderPropertyRow('retryStrategy', (
                <InlineSelect
                  label="Retry Strategy"
                  value={renderData.retryStrategy || 'count'}
                  onChange={(value) => handlePropertyChange('retryStrategy', value)}
                  options={[
                    { label: 'Count', value: 'count' },
                    { label: 'Until Condition', value: 'untilCondition' },
                  ]}
                />
              ), 7)}
              {renderData.retryEnabled && renderData.retryStrategy === 'count' && renderPropertyRow('retryCount', (
                <InlineNumberInput
                  label="Retry Count"
                  value={renderData.retryCount || 3}
                  onChange={(value) => handlePropertyChange('retryCount', value)}
                  placeholder="3"
                  onOpenPopup={handleOpenPopup}
                />
              ), 8)}
            </div>
          );
        
        case NodeType.STORAGE:
          const storageAction = renderData.action || 'getCookie';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={storageAction}
                  onChange={(value) => handlePropertyChange('action', value)}
                  options={[
                    { label: 'Get Cookie', value: 'getCookie' },
                    { label: 'Set Cookie', value: 'setCookie' },
                    { label: 'Clear Cookies', value: 'clearCookies' },
                    { label: 'Get Local Storage', value: 'getLocalStorage' },
                    { label: 'Set Local Storage', value: 'setLocalStorage' },
                    { label: 'Clear Local Storage', value: 'clearLocalStorage' },
                    { label: 'Get Session Storage', value: 'getSessionStorage' },
                    { label: 'Set Session Storage', value: 'setSessionStorage' },
                    { label: 'Clear Session Storage', value: 'clearSessionStorage' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('contextKey', (
                <InlineTextInput
                  label="Context Key"
                  value={renderData.contextKey || 'storageResult'}
                  onChange={(value) => handlePropertyChange('contextKey', value)}
                  placeholder="storageResult"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
            </div>
          );
        
        case NodeType.DIALOG:
          const dialogAction = renderData.action || 'accept';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={dialogAction}
                  onChange={(value) => handlePropertyChange('action', value)}
                  options={[
                    { label: 'Accept', value: 'accept' },
                    { label: 'Dismiss', value: 'dismiss' },
                    { label: 'Prompt', value: 'prompt' },
                    { label: 'Wait', value: 'waitForDialog' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
            </div>
          );
        
        case NodeType.DOWNLOAD:
          const downloadAction = renderData.action || 'waitForDownload';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={downloadAction}
                  onChange={(value) => handlePropertyChange('action', value)}
                  options={[
                    { label: 'Wait', value: 'waitForDownload' },
                    { label: 'Save', value: 'saveDownload' },
                    { label: 'Get Path', value: 'getDownloadPath' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
            </div>
          );
        
        case NodeType.IFRAME:
          const iframeAction = renderData.action || 'switchToIframe';
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('action', (
                <InlineSelect
                  label="Action"
                  value={iframeAction}
                  onChange={(value) => handlePropertyChange('action', value)}
                  options={[
                    { label: 'Switch To', value: 'switchToIframe' },
                    { label: 'Switch Back', value: 'switchToMainFrame' },
                    { label: 'Get Content', value: 'getIframeContent' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
            </div>
          );
        
        case NodeType.WAIT:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('waitType', (
                <InlineSelect
                  label="Wait Type"
                  value={renderData.waitType || 'timeout'}
                  onChange={(value) => handlePropertyChange('waitType', value)}
                  options={[
                    { label: 'Timeout', value: 'timeout' },
                    { label: 'Selector', value: 'selector' },
                    { label: 'URL Pattern', value: 'url' },
                    { label: 'JavaScript Condition', value: 'condition' },
                  ]}
                />
              ), 0)}
              {renderData.waitType === 'timeout' ? (
                renderPropertyRow('value', (
                  <InlineNumberInput
                    label="Value (ms)"
                    value={typeof renderData.value === 'number' ? renderData.value : parseInt(String(renderData.value || 1000), 10)}
                    onChange={(value) => handlePropertyChange('value', value)}
                    placeholder="1000"
                    onOpenPopup={handleOpenPopup}
                  />
                ), 1)
              ) : renderData.waitType === 'selector' ? (
                <>
                  {renderPropertyRow('selectorType', (
                    <InlineSelect
                      label="Selector Type"
                      value={renderData.selectorType || 'css'}
                      onChange={(value) => handlePropertyChange('selectorType', value)}
                      options={[
                        { label: 'CSS', value: 'css' },
                        { label: 'XPath', value: 'xpath' },
                      ]}
                    />
                  ), 1)}
                  {renderPropertyRow('value', (
                    <InlineTextInput
                      label="Selector"
                      value={typeof renderData.value === 'string' ? renderData.value : ''}
                      onChange={(value) => handlePropertyChange('value', value)}
                      placeholder="#element or //div[@class='element']"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 2)}
                  {renderPropertyRow('timeout', (
                    <InlineNumberInput
                      label="Timeout"
                      value={renderData.timeout || 30000}
                      onChange={(value) => handlePropertyChange('timeout', value)}
                      placeholder="30000"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 3)}
                </>
              ) : renderData.waitType === 'url' ? (
                <>
                  {renderPropertyRow('value', (
                    <InlineTextInput
                      label="URL Pattern"
                      value={typeof renderData.value === 'string' ? renderData.value : ''}
                      onChange={(value) => handlePropertyChange('value', value)}
                      placeholder="/pattern/ or exact-url"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 1)}
                  {renderPropertyRow('timeout', (
                    <InlineNumberInput
                      label="Timeout"
                      value={renderData.timeout || 30000}
                      onChange={(value) => handlePropertyChange('timeout', value)}
                      placeholder="30000"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 2)}
                </>
              ) : (
                <>
                  {renderPropertyRow('value', (
                    <InlineTextarea
                      label="Condition"
                      value={typeof renderData.value === 'string' ? renderData.value : ''}
                      onChange={(value) => handlePropertyChange('value', value)}
                      placeholder="() => document.querySelector('.loaded')"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 1)}
                  {renderPropertyRow('timeout', (
                    <InlineNumberInput
                      label="Timeout"
                      value={renderData.timeout || 30000}
                      onChange={(value) => handlePropertyChange('timeout', value)}
                      placeholder="30000"
                      onOpenPopup={handleOpenPopup}
                    />
                  ), 2)}
                </>
              )}
              {renderData.retryEnabled && renderPropertyRow('retryStrategy', (
                <InlineSelect
                  label="Retry Strategy"
                  value={renderData.retryStrategy || 'count'}
                  onChange={(value) => handlePropertyChange('retryStrategy', value)}
                  options={[
                    { label: 'Count', value: 'count' },
                    { label: 'Until Condition', value: 'untilCondition' },
                  ]}
                />
              ), 3)}
              {renderData.retryEnabled && renderData.retryStrategy === 'count' && renderPropertyRow('retryCount', (
                <InlineNumberInput
                  label="Retry Count"
                  value={renderData.retryCount || 3}
                  onChange={(value) => handlePropertyChange('retryCount', value)}
                  placeholder="3"
                  onOpenPopup={handleOpenPopup}
                />
              ), 4)}
            </div>
          );
        
        case NodeType.JAVASCRIPT_CODE:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('code', (
                <InlineTextarea
                  label="Code"
                  value={renderData.code || ''}
                  onChange={(value) => handlePropertyChange('code', value)}
                  placeholder="// Your code here"
                  field="code"
                  onOpenPopup={(_type, label, value, onChange, placeholder, min, max, field) => {
                    handleOpenPopup('code', label, value, onChange, placeholder, min, max, field);
                  }}
                />
              ), 0)}
            </div>
          );
        
        case NodeType.LOOP:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('arrayVariable', (
                <InlineTextInput
                  label="Array Var"
                  value={renderData.arrayVariable || ''}
                  onChange={(value) => handlePropertyChange('arrayVariable', value)}
                  placeholder="items (variable name)"
                  onOpenPopup={handleOpenPopup}
                />
              ), 0)}
            </div>
          );
        
        case NodeType.OPEN_BROWSER:
          const browserData = renderData as OpenBrowserNodeData;
          const maxWindow = browserData.maxWindow !== false; // Default to true
          const capabilitiesCount = browserData.capabilities ? Object.keys(browserData.capabilities).length : 0;
          const launchOptionsCount = browserData.launchOptions ? Object.keys(browserData.launchOptions).length : 0;
          
          return (
            <>
              <div className="mt-2 space-y-1">
                {renderPropertyRow('browser', (
                  <InlineSelect
                    label="Browser"
                    value={browserData.browser || 'chromium'}
                    onChange={(value) => handlePropertyChange('browser', value)}
                    options={[
                      { label: 'Chromium', value: 'chromium' },
                      { label: 'Firefox', value: 'firefox' },
                      { label: 'WebKit', value: 'webkit' },
                    ]}
                  />
                ), 0)}
                {renderPropertyRow('maxWindow', (
                  <InlineCheckbox
                    label="Max Window"
                    value={maxWindow}
                    onChange={(value) => {
                      handlePropertyChange('maxWindow', value);
                      // If disabling max window, set default viewport if not set
                      if (!value && !browserData.viewportWidth && !browserData.viewportHeight) {
                        handlePropertyChange('viewportWidth', 1280);
                        handlePropertyChange('viewportHeight', 720);
                      }
                    }}
                  />
                ), 1)}
                {!maxWindow && renderPropertyRow('viewportWidth', (
                  <InlineNumberInput
                    label="Width"
                    value={browserData.viewportWidth || 1280}
                    onChange={(value) => handlePropertyChange('viewportWidth', value)}
                    placeholder="1280"
                    onOpenPopup={handleOpenPopup}
                  />
                ), 2)}
                {!maxWindow && renderPropertyRow('viewportHeight', (
                  <InlineNumberInput
                    label="Height"
                    value={browserData.viewportHeight || 720}
                    onChange={(value) => handlePropertyChange('viewportHeight', value)}
                    placeholder="720"
                    onOpenPopup={handleOpenPopup}
                  />
                ), 3)}
                {renderPropertyRow('headless', (
                  <InlineCheckbox
                    label="Headless"
                    value={browserData.headless !== false}
                    onChange={(value) => handlePropertyChange('headless', value)}
                  />
                ), 4)}
                {renderPropertyRow('stealthMode', (
                  <InlineCheckbox
                    label="Stealth Mode"
                    value={browserData.stealthMode || false}
                    onChange={(value) => handlePropertyChange('stealthMode', value)}
                  />
                ), 5)}
                {/* View/Add Options button - rendered directly, NOT via renderPropertyRow */}
                <div className="mt-1">
                  <button
                    onClick={() => {
                      setShowCapabilitiesPopup(true);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-blue-500 rounded text-white transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    View/Add Options
                    {(capabilitiesCount > 0 || launchOptionsCount > 0) && (
                      <span className="ml-2 text-blue-400">
                        (C:{capabilitiesCount}, L:{launchOptionsCount})
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </>
          );
        
        case NodeType.INT_VALUE:
          return (
            <div className="mt-2 space-y-1">
              <InlineNumberInput
                label="Value"
                value={renderData.value ?? 0}
                onChange={(value) => handlePropertyChange('value', value)}
                placeholder="0"
                field="value"
                onOpenPopup={handleOpenPopup}
              />
            </div>
          );
        
        case NodeType.STRING_VALUE:
          return (
            <div className="mt-2 space-y-1">
              <InlineTextInput
                label="Value"
                value={renderData.value ?? ''}
                onChange={(value) => handlePropertyChange('value', value)}
                placeholder="Enter string value"
                field="value"
                onOpenPopup={handleOpenPopup}
              />
            </div>
          );
        
        case NodeType.BOOLEAN_VALUE:
          return (
            <div className="mt-2 space-y-1">
              <InlineSelect
                label="Value"
                value={String(renderData.value ?? false)}
                onChange={(value) => handlePropertyChange('value', value === 'true')}
                options={[
                  { label: 'True', value: 'true' },
                  { label: 'False', value: 'false' },
                ]}
              />
            </div>
          );
        
        case NodeType.INPUT_VALUE:
          const inputDataType = renderData.dataType || PropertyDataType.STRING;
          const inputValue = renderData.value ?? (inputDataType === PropertyDataType.BOOLEAN ? false : inputDataType === PropertyDataType.INT ? 0 : '');
          
          return (
            <div className="mt-2 space-y-1">
              <InlineSelect
                label="Data Type"
                value={inputDataType}
                onChange={(value) => {
                  const newDataType = value as PropertyDataType;
                  // Reset value when type changes
                  let newValue: string | number | boolean;
                  if (newDataType === PropertyDataType.BOOLEAN) {
                    newValue = false;
                  } else if (newDataType === PropertyDataType.INT || newDataType === PropertyDataType.FLOAT || newDataType === PropertyDataType.DOUBLE) {
                    newValue = 0;
                  } else {
                    newValue = '';
                  }
                  handlePropertyChange('dataType', newDataType);
                  handlePropertyChange('value', newValue);
                }}
                options={[
                  { label: 'String', value: PropertyDataType.STRING },
                  { label: 'Int', value: PropertyDataType.INT },
                  { label: 'Float', value: PropertyDataType.FLOAT },
                  { label: 'Double', value: PropertyDataType.DOUBLE },
                  { label: 'Boolean', value: PropertyDataType.BOOLEAN },
                ]}
              />
              {inputDataType === PropertyDataType.STRING && (
                <InlineTextInput
                  label="Value"
                  value={String(inputValue)}
                  onChange={(value) => handlePropertyChange('value', value)}
                  placeholder="Enter string value"
                  field="value"
                  onOpenPopup={handleOpenPopup}
                />
              )}
              {(inputDataType === PropertyDataType.INT || inputDataType === PropertyDataType.FLOAT || inputDataType === PropertyDataType.DOUBLE) && (
                <InlineNumberInput
                  label="Value"
                  value={typeof inputValue === 'number' ? inputValue : parseFloat(String(inputValue)) || 0}
                  onChange={(value) => handlePropertyChange('value', value)}
                  placeholder="0"
                  field="value"
                  onOpenPopup={handleOpenPopup}
                />
              )}
              {inputDataType === PropertyDataType.BOOLEAN && (
                <InlineSelect
                  label="Value"
                  value={inputValue ? '1' : '0'}
                  onChange={(value) => handlePropertyChange('value', value === '1')}
                  options={[
                    { label: '0', value: '0' },
                    { label: '1', value: '1' },
                  ]}
                />
              )}
            </div>
          );
        
        case NodeType.API_REQUEST:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('method', (
                <InlineSelect
                  label="Method"
                  value={renderData.method || 'GET'}
                  onChange={(value) => handlePropertyChange('method', value)}
                  options={[
                    { label: 'GET', value: 'GET' },
                    { label: 'POST', value: 'POST' },
                    { label: 'PUT', value: 'PUT' },
                    { label: 'DELETE', value: 'DELETE' },
                    { label: 'PATCH', value: 'PATCH' },
                    { label: 'HEAD', value: 'HEAD' },
                    { label: 'OPTIONS', value: 'OPTIONS' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('url', (
                <InlineTextInput
                  label="URL"
                  value={renderData.url || ''}
                  onChange={(value) => handlePropertyChange('url', value)}
                  placeholder="https://api.example.com/users"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {renderPropertyRow('contextKey', (
                <InlineTextInput
                  label="Context Key"
                  value={renderData.contextKey || 'apiResponse'}
                  onChange={(value) => handlePropertyChange('contextKey', value)}
                  placeholder="apiResponse"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
            </div>
          );
        
        case NodeType.API_CURL:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('curlCommand', (
                <InlineTextarea
                  label="cURL Command"
                  value={renderData.curlCommand || ''}
                  onChange={(value) => handlePropertyChange('curlCommand', value)}
                  placeholder="curl -X POST https://api.example.com/users"
                  onOpenPopup={handleOpenPopup}
                />
              ), 0)}
              {renderPropertyRow('contextKey', (
                <InlineTextInput
                  label="Context Key"
                  value={renderData.contextKey || 'apiResponse'}
                  onChange={(value) => handlePropertyChange('contextKey', value)}
                  placeholder="apiResponse"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
            </div>
          );
        
        case NodeType.LOAD_CONFIG_FILE:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('filePath', (
                <InlineTextInput
                  label="File Path"
                  value={renderData.filePath || ''}
                  onChange={(value) => handlePropertyChange('filePath', value)}
                  placeholder="tests/resources/env.Env1.json"
                  onOpenPopup={handleOpenPopup}
                />
              ), 0)}
              {renderData.contextKey && renderPropertyRow('contextKey', (
                <InlineTextInput
                  label="Context Key"
                  value={renderData.contextKey || ''}
                  onChange={(value) => handlePropertyChange('contextKey', value)}
                  placeholder="env (optional)"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
            </div>
          );
        
        case NodeType.SELECT_CONFIG_FILE:
          const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            
            if (!file.name.endsWith('.json')) {
              alert('Please select a JSON file');
              return;
            }
            
            try {
              const fileContent = await file.text();
              // Validate JSON
              JSON.parse(fileContent);
              handlePropertyChange('fileContent', fileContent);
              handlePropertyChange('fileName', file.name);
            } catch (error: any) {
              alert(`Invalid JSON: ${error.message}`);
            }
          };
          
          return (
            <div className="mt-2 space-y-1">
              <input
                ref={selectConfigFileInputRef}
                type="file"
                accept="application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="px-2 py-1">
                <button
                  type="button"
                  onClick={() => selectConfigFileInputRef.current?.click()}
                  className="w-full px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-200 transition-colors"
                >
                  {renderData.fileName || 'Select JSON File'}
                </button>
                {renderData.fileName && (
                  <p className="mt-1 text-xs text-gray-400 truncate" title={renderData.fileName}>
                    {renderData.fileName}
                  </p>
                )}
              </div>
              {renderData.contextKey && renderPropertyRow('contextKey', (
                <InlineTextInput
                  label="Context Key"
                  value={renderData.contextKey || ''}
                  onChange={(value) => handlePropertyChange('contextKey', value)}
                  placeholder="env (optional)"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
            </div>
          );
        
        case NodeType.DB_CONNECT:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('dbType', (
                <InlineSelect
                  label="DB Type"
                  value={renderData.dbType || 'postgres'}
                  onChange={(value) => handlePropertyChange('dbType', value)}
                  options={[
                    { label: 'PostgreSQL', value: 'postgres' },
                    { label: 'MySQL', value: 'mysql' },
                    { label: 'MongoDB', value: 'mongodb' },
                    { label: 'SQLite', value: 'sqlite' },
                  ]}
                />
              ), 0)}
              {renderPropertyRow('connectionKey', (
                <InlineTextInput
                  label="Connection Key"
                  value={renderData.connectionKey || 'dbConnection'}
                  onChange={(value) => handlePropertyChange('connectionKey', value)}
                  placeholder="dbConnection"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {renderData.configKey && renderPropertyRow('configKey', (
                <InlineTextInput
                  label="Config Key"
                  value={renderData.configKey || ''}
                  onChange={(value) => handlePropertyChange('configKey', value)}
                  placeholder="dbConfig"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {!renderData.configKey && renderData.host && renderPropertyRow('host', (
                <InlineTextInput
                  label="Host"
                  value={renderData.host || ''}
                  onChange={(value) => handlePropertyChange('host', value)}
                  placeholder="localhost"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {!renderData.configKey && renderData.database && renderPropertyRow('database', (
                <InlineTextInput
                  label="Database"
                  value={renderData.database || ''}
                  onChange={(value) => handlePropertyChange('database', value)}
                  placeholder="mydb"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
            </div>
          );
        
        case NodeType.DB_DISCONNECT:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('connectionKey', (
                <InlineTextInput
                  label="Connection Key"
                  value={renderData.connectionKey || 'dbConnection'}
                  onChange={(value) => handlePropertyChange('connectionKey', value)}
                  placeholder="dbConnection"
                  onOpenPopup={handleOpenPopup}
                />
              ), 0)}
            </div>
          );
        
        case NodeType.DB_QUERY:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('connectionKey', (
                <InlineTextInput
                  label="Connection Key"
                  value={renderData.connectionKey || 'dbConnection'}
                  onChange={(value) => handlePropertyChange('connectionKey', value)}
                  placeholder="dbConnection"
                  onOpenPopup={handleOpenPopup}
                />
              ), 0)}
              {renderPropertyRow('queryType', (
                <InlineSelect
                  label="Query Type"
                  value={renderData.queryType || 'sql'}
                  onChange={(value) => handlePropertyChange('queryType', value)}
                  options={[
                    { label: 'SQL', value: 'sql' },
                    { label: 'MongoDB', value: 'mongodb' },
                    { label: 'Raw', value: 'raw' },
                  ]}
                />
              ), 1)}
              {renderData.queryKey ? (
                renderPropertyRow('queryKey', (
                  <InlineTextInput
                    label="Query Key"
                    value={renderData.queryKey || ''}
                    onChange={(value) => handlePropertyChange('queryKey', value)}
                    placeholder="queryFromContext"
                    onOpenPopup={handleOpenPopup}
                  />
                ), 2)
              ) : (
                renderPropertyRow('query', (
                  <InlineTextarea
                    label="Query"
                    value={typeof renderData.query === 'string' ? renderData.query : JSON.stringify(renderData.query || '')}
                    onChange={(value) => handlePropertyChange('query', value)}
                    placeholder="SELECT * FROM users"
                    onOpenPopup={handleOpenPopup}
                  />
                ), 2)
              )}
              {renderPropertyRow('contextKey', (
                <InlineTextInput
                  label="Context Key"
                  value={renderData.contextKey || 'dbResult'}
                  onChange={(value) => handlePropertyChange('contextKey', value)}
                  placeholder="dbResult"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={renderData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 4)}
            </div>
          );
        
        default:
          return null;
      }
    }

    // Special handling for comment box plugin
    if (isCommentBox) {
      const content = renderData.content || '';
      return (
        <div className="mt-2">
          <div
            onClick={() => setShowMarkdownEditor(true)}
            className="cursor-pointer min-h-[60px] p-2 rounded border border-gray-600 hover:border-gray-500 transition-colors"
            style={{ color: textColor }}
          >
            <MarkdownRenderer content={content} />
          </div>
        </div>
      );
    }

    // Special handling for shortcut plugin
    if (isShortcut) {
      const shortcut = renderData.shortcut || '';
      const nodes = useWorkflowStore.getState().nodes;
      
      // Get existing shortcuts for validation
      const existingShortcuts = nodes
        .filter(n => n.data.type === 'shortcut.shortcut' && n.id !== id)
        .map(n => (n.data.shortcut || '').toLowerCase())
        .filter(s => s.length === 1);

      const handleShortcutChange = (value: string) => {
        // Only allow single character
        const newShortcut = value.slice(-1).toLowerCase();
        const validation = validateShortcut(newShortcut, existingShortcuts);
        
        if (validation.isValid) {
          setShortcutError(null);
          handlePropertyChange('shortcut', newShortcut);
        } else {
          setShortcutError(validation.error || 'Invalid shortcut');
          // Still update the value so user can see what they typed
          handlePropertyChange('shortcut', newShortcut);
        }
      };

      return (
        <div className="mt-2">
          <div>
            <label className="text-xs mb-1 block" style={{ color: textColor, opacity: 0.7 }}>
              Shortcut Key
            </label>
            <div className="relative">
              <input
                type="text"
                value={shortcut}
                onChange={(e) => handleShortcutChange(e.target.value)}
                maxLength={1}
                placeholder="a-z, 0-9"
                className={`w-full px-2 py-1.5 bg-gray-700 border rounded text-sm ${
                  shortcutError ? 'border-red-500' : 'border-gray-600'
                }`}
                style={{ color: textColor }}
              />
              {shortcut && !shortcutError && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-mono bg-blue-600 px-2 py-0.5 rounded">
                  {shortcut.toUpperCase()}
                </div>
              )}
            </div>
            {shortcutError && (
              <div className="text-xs text-red-400 mt-1">{shortcutError}</div>
            )}
            {shortcut && !shortcutError && (
              <div className="text-xs text-gray-400 mt-1">
                Press "{shortcut.toUpperCase()}" to navigate to this node
              </div>
            )}
          </div>
        </div>
      );
    }

    // Plugin nodes (generic handling)
    const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
    if (pluginNode && pluginNode.definition.defaultData) {
      const properties = Object.keys(pluginNode.definition.defaultData);
      return (
        <div className="mt-2 space-y-1">
          {properties.map((key) => {
            const value = data[key] ?? pluginNode.definition.defaultData![key];
            const valueType = typeof value;
            
            if (valueType === 'boolean') {
              return (
                <InlineCheckbox
                  key={key}
                  label={key}
                  value={value}
                  onChange={(val) => handlePropertyChange(key, val)}
                />
              );
            } else if (valueType === 'number') {
              return (
                <InlineNumberInput
                  key={key}
                  label={key}
                  value={value}
                  onChange={(val) => handlePropertyChange(key, val)}
                  field={key}
                  onOpenPopup={handleOpenPopup}
                />
              );
            } else {
              return (
                <InlineTextInput
                  key={key}
                  label={key}
                  value={String(value || '')}
                  onChange={(val) => handlePropertyChange(key, val)}
                  field={key}
                  onOpenPopup={handleOpenPopup}
                />
              );
            }
          })}
        </div>
      );
    }

    return null;
  };

  // Memoize renderProperties to prevent creating new JSX objects on every render
  // Dependencies: renderPropertyRow (which depends on edgesForThisNode, sourceNodes, etc.), nodeType, stableData
  // Note: We can't include renderPropertyRow in deps as it's a useCallback that changes when edges/nodes change
  // Instead, we memoize based on the actual data that affects the output
  // Include _inputConnections in dependencies so properties re-render when converted to inputs
  const inputConnectionsForMemo = stableData._inputConnections ? JSON.stringify(stableData._inputConnections) : '';
  // Include maxWindow and browser properties in dependencies for OPEN_BROWSER nodes
  const browserDataForMemo = nodeType === NodeType.OPEN_BROWSER 
    ? `${(stableData as OpenBrowserNodeData).maxWindow}|${(stableData as OpenBrowserNodeData).browser}|${(stableData as OpenBrowserNodeData).stealthMode}|${(stableData as OpenBrowserNodeData).capabilities ? Object.keys((stableData as OpenBrowserNodeData).capabilities || {}).length : 0}|${(stableData as OpenBrowserNodeData).launchOptions ? Object.keys((stableData as OpenBrowserNodeData).launchOptions || {}).length : 0}`
    : '';
  // Include value for value nodes to ensure real-time updates
  const valueForMemo = (nodeType === NodeType.INT_VALUE || 
                        nodeType === NodeType.STRING_VALUE || 
                        nodeType === NodeType.BOOLEAN_VALUE || 
                        nodeType === NodeType.INPUT_VALUE)
    ? JSON.stringify(renderData.value)
    : '';
  // Include dataType for INPUT_VALUE nodes
  const dataTypeForMemo = nodeType === NodeType.INPUT_VALUE 
    ? renderData.dataType 
    : '';
  const properties = useMemo(() => renderProperties(), [
    nodeType, 
    renderData.code, 
    renderData.url,
    renderData.selector,
    renderData.text,
    renderData.method,
    renderData.curlCommand,
    renderData.contextKey,
    edgesForThisNode.length,
    sourceNodes.length,
    connectingHandleId,
    inputConnectionsForMemo,
    browserDataForMemo, // Include browser-specific data in dependencies
    valueForMemo, // Include value for value nodes
    dataTypeForMemo, // Include dataType for INPUT_VALUE nodes
  ]);
  const hasProperties = properties !== null;

  // Get glow color - use user-selected backgroundColor if available, otherwise use node type color
  const glowColor = getNodeGlowColor(nodeType, backgroundColor);
  
  // Convert backgroundColor to rgba for glassmorphism effect
  const glassmorphismBg = backgroundColor && backgroundColor !== '#1f2937' 
    ? hexToRgba(backgroundColor, 0.7) 
    : 'rgba(30, 30, 30, 0.7)';
  
  // Build style object with colors
  // Priority: validation error > execution error > executing > paused > search highlighted > default
  const nodeStyle: React.CSSProperties = {
    width: currentWidth,
    height: currentHeight,
    minWidth: 150,
    minHeight: hasProperties && !isMinimized ? undefined : 50,
    backgroundColor: isPaused 
      ? 'rgba(234, 179, 8, 0.3)' // Yellow background for paused nodes
      : (hasValidationError || isFailed || isExecuting 
        ? backgroundColor 
        : glassmorphismBg), // Glassmorphism effect using user color
    backdropFilter: isPaused || hasValidationError || isFailed || isExecuting 
      ? 'none' 
      : 'blur(10px)', // Glassmorphism blur
    WebkitBackdropFilter: isPaused || hasValidationError || isFailed || isExecuting 
      ? 'none' 
      : 'blur(10px)', // Safari support
    borderColor: isPaused 
      ? '#eab308' // Yellow border for paused nodes
      : (hasValidationError ? '#ef4444' : (isFailed ? '#ef4444' : (isExecuting ? '#22c55e' : borderColor))),
    borderWidth: '2px',
    borderStyle: 'solid',
    boxShadow: isPaused
      ? '0 0 20px rgba(234, 179, 8, 0.6), 0 4px 6px rgba(0, 0, 0, 0.3)' // Yellow glow for paused nodes
      : (hasValidationError || isFailed || isExecuting
        ? undefined
        : isSearchHighlighted
        ? '0 0 20px rgba(245, 158, 11, 0.6), 0 4px 6px rgba(0, 0, 0, 0.3)' // Orange glow for search highlighted nodes
        : `0 0 20px ${glowColor}, 0 4px 6px rgba(0, 0, 0, 0.3)`), // Color-coded glow using user color
  };

  return (
    <div
      className={`relative px-4 py-3 rounded-lg shadow-lg ${
        isExecuting ? 'animate-pulse' : ''
      } ${bypass ? 'opacity-60' : ''}`}
      style={nodeStyle}
      onDoubleClick={handleBoundaryDoubleClick}
    >
      {selected && (
        <NodeMenuBar
          key={`${id}-${bypass}-${nodeDataFromStore.failSilently}-${isMinimized}-${nodeDataFromStore.isTest}-${isPinned}-${nodeDataFromStore.breakpoint}`}
          nodeId={id}
          bypass={bypass}
          failSilently={nodeDataFromStore.failSilently}
          isMinimized={isMinimized}
          isTest={nodeDataFromStore.isTest}
          isPinned={isPinned}
          breakpoint={nodeDataFromStore.breakpoint}
        />
      )}
      {/* Default control flow handle (driver) - skip for utility nodes */}
      {!isUtilityNode && (
        <Handle
          type="target"
          position={Position.Left}
          id="driver"
          className={`transition-all duration-200 ${
            connectingHandleId === 'driver' 
              ? 'connecting' 
              : hasDriverConnection 
                ? 'handle-connected' 
                : ''
          }`}
          style={{ 
            display: nodeType === NodeType.START || nodeType === 'start' ? 'none' : 'block',
            top: '50%',
            transform: 'translateY(-50%)',
            borderColor: connectingHandleId === 'driver' 
              ? '#22c55e' 
              : hasDriverConnection 
                ? '#22c55e' 
                : '#4a9eff',
          }}
          onMouseEnter={() => setConnectingHandleId('driver')}
          onMouseLeave={() => setConnectingHandleId(null)}
        />
      )}
      {/* Deprecation Warning Banner */}
      {isDeprecatedNodeType(nodeType as NodeType) && (() => {
        const suggestion = getMigrationSuggestion(nodeType as NodeType);
        return (
          <div 
            className="px-2 py-1 -mx-4 -mt-3 mb-1 rounded-t-lg bg-yellow-900/30 border-b border-yellow-600/50"
            style={{ fontSize: '0.7rem' }}
          >
            <div className="flex items-center gap-1 text-yellow-400">
              <span>⚠️</span>
              <span className="font-semibold">Deprecated:</span>
              <span>This node type is deprecated.</span>
              {suggestion && (
                <span>Use <strong>{suggestion.newType}</strong> with action="{suggestion.action}" instead.</span>
              )}
            </div>
          </div>
        );
      })()}
      {/* Header Block with Status Dot */}
      <div 
        className="flex items-center gap-2 px-2 py-1.5 -mx-4 -mt-3 mb-2 rounded-t-lg min-w-0"
        style={{ 
          backgroundColor: 'rgba(40, 40, 40, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Status Dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            backgroundColor: isExecuting 
              ? '#22c55e' 
              : hasValidationError 
                ? '#eab308' 
                : isFailed 
                  ? '#ef4444' 
                  : '#6b7280',
            boxShadow: isExecuting 
              ? '0 0 6px rgba(34, 197, 94, 0.8)' 
              : hasValidationError 
                ? '0 0 6px rgba(234, 179, 8, 0.8)' 
                : isFailed 
                  ? '0 0 6px rgba(239, 68, 68, 0.8)' 
                  : undefined,
            animation: isExecuting ? 'pulse 2s ease-in-out infinite' : undefined,
          }}
          title={
            isExecuting 
              ? 'Executing' 
              : hasValidationError 
                ? 'Validation Error' 
                : isFailed 
                  ? 'Failed' 
                  : 'Idle'
          }
        />
        {icon ? (() => {
          const IconComponent = icon.icon;
          return (
            <div className="flex-shrink-0">
              <IconComponent sx={{ fontSize: '1.25rem', color: icon.color }} />
            </div>
          );
        })() : (
          <span className="text-lg flex-shrink-0">{frontendPluginRegistry.getPluginNode(nodeType)?.icon || '📦'}</span>
        )}
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            className="text-sm font-medium bg-gray-700 border border-gray-600 rounded px-2 py-0.5 flex-1 min-w-0"
            style={{ color: textColor }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className={`text-sm font-medium flex-1 min-w-0 truncate ${(isFailed || hasValidationError) ? 'cursor-pointer hover:underline' : 'cursor-text'}`}
            style={{ color: textColor }}
            onDoubleClick={handleDoubleClickHeader}
            onClick={(e) => {
              if (isFailed || hasValidationError) {
                e.stopPropagation();
                if (isFailed) {
                  showErrorPopupForNode(id);
                }
                // Validation errors are shown in ValidationErrorPopup, not NodeErrorPopup
              }
            }}
            title={`${label}${isReusableNode && renderData.contextName ? ` (${renderData.contextName})` : ''}${isRunReusableNode && renderData.contextName ? ` → ${renderData.contextName}` : ''}${isEndNode ? ' (End)' : ''}${bypass ? ' (bypassed)' : ''}${failSilently ? ' (failSilently)' : ''} | Double-click to rename`}
          >
            {label}
            {isReusableNode && renderData.contextName && (
              <span className="ml-2 text-xs text-blue-400" title="Reusable flow definition">
                ({renderData.contextName})
              </span>
            )}
            {isRunReusableNode && renderData.contextName && (
              <span className="ml-2 text-xs text-green-400" title="Executes reusable flow">
                → {renderData.contextName}
              </span>
            )}
            {isEndNode && (
              <span className="ml-2 text-xs text-gray-400" title="End of reusable flow">
                (End)
              </span>
            )}
            {bypass && <span className="ml-2 text-xs text-yellow-400">(bypassed)</span>}
            {failSilently && <span className="ml-2 text-xs text-orange-400">(failSilently)</span>}
          </div>
        )}
      </div>
      {hasProperties && !isMinimized && (
        <div className="mt-2 border-t border-gray-700 pt-2 min-w-0">
          {properties}
        </div>
      )}
      {/* Render CapabilitiesPopup via portal to avoid ReactFlow clipping */}
      {showCapabilitiesPopup && nodeType === NodeType.OPEN_BROWSER && typeof document !== 'undefined' && createPortal(
          <CapabilitiesPopup
            node={{ id, data: renderData } as any}
            onSave={(data: { capabilities?: Record<string, any>, launchOptions?: Record<string, any> }) => {
              if (data.capabilities !== undefined) {
                handlePropertyChange('capabilities', data.capabilities);
              }
              if (data.launchOptions !== undefined) {
                handlePropertyChange('launchOptions', data.launchOptions);
              }
              setShowCapabilitiesPopup(false);
            }}
          onClose={() => {
            setShowCapabilitiesPopup(false);
          }}
        />,
        document.body
      )}
      {/* Render PropertyEditorPopup via portal to avoid ReactFlow clipping */}
      {propertyPopup && typeof document !== 'undefined' && createPortal(
        <PropertyEditorPopup
          label={propertyPopup.label}
          value={latestNodeData[propertyPopup.field] !== undefined ? latestNodeData[propertyPopup.field] : propertyPopup.value}
          type={propertyPopup.type}
          onChange={(newValue) => {
            propertyPopup.onChange(newValue);
          }}
          onClose={() => setPropertyPopup(null)}
          placeholder={propertyPopup.placeholder}
          min={propertyPopup.min}
          max={propertyPopup.max}
        />,
        document.body
      )}
      {/* Render MarkdownEditorPopup via portal for comment box */}
      {showMarkdownEditor && isCommentBox && typeof document !== 'undefined' && createPortal(
        <MarkdownEditorPopup
          value={renderData.content || ''}
          onChange={(newValue) => {
            handlePropertyChange('content', newValue);
          }}
          onClose={() => setShowMarkdownEditor(false)}
        />,
        document.body
      )}
      {selected && (
        <ResizeHandle onResize={handleResize} />
      )}
      {/* Render output handles */}
      {isSwitchNode ? (
        // Switch node: render multiple output handles
        <>
          {/* Case handles */}
          {switchCases.map((caseItem: any, index: number) => {
            const handleId = caseItem.id || `case-${index + 1}`;
            const hasCaseConnection = edgesRaw.some(e => e.source === id && e.sourceHandle === handleId);
            const caseLabel = caseItem.label || `Case ${index + 1}`;
            // Calculate vertical position: distribute evenly
            // Total height includes header (~50px) + properties if not minimized
            const totalHeight = currentHeight || (hasProperties && !isMinimized ? 200 : 50);
            const totalHandles = switchCases.length + (switchDefaultCase ? 1 : 0);
            const handleSpacing = totalHeight / (totalHandles + 1);
            const topPercent = ((index + 1) * handleSpacing / totalHeight) * 100;
            
            return (
              <div key={handleId} className="absolute inset-0 pointer-events-none">
                {/* Case label */}
                <div 
                  className="absolute text-xs text-gray-400 text-right pr-2"
                  style={{ 
                    right: '20px',
                    top: `${topPercent}%`,
                    transform: 'translateY(-50%)',
                    color: textColor,
                  }}
                >
                  {caseLabel}
                </div>
                {/* Handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className={`transition-all duration-200 pointer-events-auto ${
                    connectingHandleId === handleId
                      ? 'connecting'
                      : hasCaseConnection
                        ? 'handle-connected'
                        : ''
                  }`}
                  style={{
                    top: `${topPercent}%`,
                    borderColor: connectingHandleId === handleId
                      ? '#22c55e'
                      : hasCaseConnection
                        ? '#22c55e'
                        : '#4a9eff',
                  }}
                  onMouseEnter={() => setConnectingHandleId(handleId)}
                  onMouseLeave={() => setConnectingHandleId(null)}
                />
              </div>
            );
          })}
          {/* Default case handle */}
          {switchDefaultCase && (() => {
            const handleId = 'default';
            const hasDefaultConnection = edgesRaw.some(e => e.source === id && e.sourceHandle === handleId);
            const totalHeight = currentHeight || (hasProperties && !isMinimized ? 200 : 50);
            const totalHandles = switchCases.length + 1;
            const handleSpacing = totalHeight / (totalHandles + 1);
            const topPercent = ((switchCases.length + 1) * handleSpacing / totalHeight) * 100;
            
            return (
              <div key={handleId} className="absolute inset-0 pointer-events-none">
                {/* Default label */}
                <div 
                  className="absolute text-xs text-gray-400 text-right pr-2"
                  style={{ 
                    right: '20px',
                    top: `${topPercent}%`,
                    transform: 'translateY(-50%)',
                    color: textColor,
                  }}
                >
                  {switchDefaultCase.label || 'Default'}
                </div>
                {/* Handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className={`transition-all duration-200 pointer-events-auto ${
                    connectingHandleId === handleId
                      ? 'connecting'
                      : hasDefaultConnection
                        ? 'handle-connected'
                        : ''
                  }`}
                  style={{
                    top: `${topPercent}%`,
                    borderColor: connectingHandleId === handleId
                      ? '#22c55e'
                      : hasDefaultConnection
                        ? '#22c55e'
                        : '#4a9eff',
                  }}
                  onMouseEnter={() => setConnectingHandleId(handleId)}
                  onMouseLeave={() => setConnectingHandleId(null)}
                />
              </div>
            );
          })()}
        </>
      ) : (
        // Regular node: render single output handle - skip for utility nodes
        !isUtilityNode && (
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className={`transition-all duration-200 ${
              connectingHandleId === 'output' 
                ? 'connecting' 
                : hasOutputConnection 
                  ? 'handle-connected' 
                  : ''
            }`}
            style={{ 
              display: nodeType === NodeType.START ? 'block' : 'block',
              borderColor: connectingHandleId === 'output' 
                ? '#22c55e' 
                : hasOutputConnection 
                  ? '#22c55e' 
                  : '#4a9eff',
            }}
            onMouseEnter={() => setConnectingHandleId('output')}
            onMouseLeave={() => setConnectingHandleId(null)}
          />
        )
      )}
    </div>
  );
}
