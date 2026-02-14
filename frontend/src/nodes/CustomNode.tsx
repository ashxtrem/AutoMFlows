import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { shallow } from 'zustand/shallow';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType, PropertyDataType, OpenBrowserNodeData } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
import { useWorkflowStore } from '../store/workflowStore';
import { useSettingsStore } from '../store/settingsStore';
import { InlineTextInput, InlineNumberInput, InlineCheckbox } from '../components/InlinePropertyEditor';
import NodeMenuBar from '../components/NodeMenuBar';
import CapabilitiesPopup from '../components/CapabilitiesPopup';
import PropertyEditorPopup, { PropertyEditorType } from '../components/PropertyEditorPopup';
import MarkdownEditorPopup from '../components/MarkdownEditorPopup';
import Editor from '@monaco-editor/react';
import { X } from 'lucide-react';
import { getNodeProperties, isPropertyInputConnection, getPropertyInputHandleId } from '../utils/nodeProperties';
import { getContrastTextColor } from '../utils/colorContrast';
import { isDeprecatedNodeType, getMigrationSuggestion } from '../utils/migration';
// Import from extracted modules
import { getNodeIcon, getNodeGlowColor, hexToRgba } from './CustomNode/icons';
import { getNodeLabel } from './CustomNode/labels';
import { ResizeHandle } from './CustomNode/ResizeHandle';
import { validateConfigPaths } from './CustomNode/configValidation';
import { PropertyPopupState } from './CustomNode/types';
import { getPropertyRenderer } from './CustomNode/propertyRenderers/registry';

export default function CustomNode({ id, data, selected }: NodeProps) {
  const width = (data as any).width;
  const height = (data as any).height;
  // State for capabilities popup (only used for OPEN_BROWSER nodes)
  const [showCapabilitiesPopup, setShowCapabilitiesPopup] = useState(false);
  
  // State for property editor popup
  const [propertyPopup, setPropertyPopup] = useState<PropertyPopupState | null>(null);
  
  // State for Set Config modal (Monaco editor)
  const [showSetConfigModal, setShowSetConfigModal] = useState(false);
  const [setConfigJsonValue, setSetConfigJsonValue] = useState<string>('{}');
  const [setConfigJsonError, setSetConfigJsonError] = useState<string | null>(null);
  const [setConfigOriginalJsonValue, setSetConfigOriginalJsonValue] = useState<string>('{}');
  
  // State for markdown editor popup (for comment box)
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  
  // Get latest node data from store to avoid stale prop issues
  const storeNodes = useWorkflowStore((state) => state.nodes);
  const storeNodeData = storeNodes.find(n => n.id === id)?.data;
  // Use data prop for searchHighlighted (set in mappedNodes) but fall back to store for other properties
  // This ensures searchHighlighted updates correctly when search results change
  const latestNodeData = { ...storeNodeData, ...data };
  
  // Get nodeType early for use in useEffect
  const nodeType = latestNodeData.type as NodeType | string;
  
  // Update Set Config modal when config changes
  useEffect(() => {
    if (showSetConfigModal && nodeType === 'setConfig.setConfig') {
      const configValue = latestNodeData.config || {};
      try {
        const jsonString = JSON.stringify(configValue, null, 2);
        setSetConfigJsonValue(jsonString);
        setSetConfigOriginalJsonValue(jsonString);
        setSetConfigJsonError(null);
      } catch (error: any) {
        setSetConfigJsonError(error.message);
      }
    }
  }, [showSetConfigModal, latestNodeData.config, nodeType, id]);

  // Check if there are unsaved changes in Set Config modal
  const hasSetConfigUnsavedChanges = useCallback((): boolean => {
    try {
      const current = setConfigJsonValue.trim();
      const original = setConfigOriginalJsonValue.trim();
      
      // Parse both to compare structure (ignoring formatting)
      const currentParsed = JSON.parse(current);
      const originalParsed = JSON.parse(original);
      
      return JSON.stringify(currentParsed) !== JSON.stringify(originalParsed);
    } catch {
      // If parsing fails, consider it changed if strings differ
      return setConfigJsonValue.trim() !== setConfigOriginalJsonValue.trim();
    }
  }, [setConfigJsonValue, setConfigOriginalJsonValue]);

  // Handle closing Set Config modal with unsaved changes check
  const handleCloseSetConfigModal = useCallback(() => {
    if (hasSetConfigUnsavedChanges()) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmed) {
        return;
      }
    }
    setShowSetConfigModal(false);
    setSetConfigJsonError(null);
    // Reset to original value if not saved
    setSetConfigJsonValue(setConfigOriginalJsonValue);
  }, [hasSetConfigUnsavedChanges, setConfigOriginalJsonValue]);

  // Handle keyboard events for Set Config modal (ESC and Backspace prevention)
  useEffect(() => {
    if (!showSetConfigModal || nodeType !== 'setConfig.setConfig') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent backspace from deleting nodes when modal is open
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        // Allow backspace in Monaco editor and input fields
        const isInEditableElement = target instanceof HTMLInputElement || 
                                    target instanceof HTMLTextAreaElement ||
                                    target.closest('.monaco-editor') !== null ||
                                    target.closest('[contenteditable="true"]') !== null;
        
        if (!isInEditableElement) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }
      
      // Handle ESC key
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleCloseSetConfigModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to catch early
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showSetConfigModal, nodeType, handleCloseSetConfigModal]);
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
    config: latestNodeData.config, // Include config for setConfig nodes
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
  
  const customLabel = renderData.label;
  const defaultLabel = getNodeLabel(nodeType);
  const label = customLabel || defaultLabel;
  const icon = getNodeIcon(nodeType);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNodeDimensions = useWorkflowStore((state) => state.updateNodeDimensions);
  const renameNode = useWorkflowStore((state) => state.renameNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
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
  const breakpoint = nodeDataFromStore.breakpoint;
  const isTest = nodeDataFromStore.isTest;
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
      
      // Special handling for API_CURL nodes - use property key width only
      if (nodeType === NodeType.API_CURL) {
        // Calculate minimum width based on property key only
        // Label "cURL Command" is ~13 chars, so: 13 * 8 + 60 + 3 = 104 + 63 = 167px
        const curlKeyWidth = 13 * 8 + 60 + 3; // ~167px
        maxPropertyWidth = Math.max(maxPropertyWidth, curlKeyWidth);
      }
      
      // Calculate width for each property
      properties.forEach(prop => {
        // Skip properties that are converted to inputs (they show connection info, not values)
        const isInput = isPropertyInputConnection(data, prop.name);
        if (isInput) {
          // For inputs, estimate width based on label only (connection info is shorter)
          const inputWidth = (prop.label.length * 8) + 60 + 3; // label + min-w-[60px] + 3px
          maxPropertyWidth = Math.max(maxPropertyWidth, inputWidth);
        } else {
          // Calculate width based on property key (label) only, ignoring value length
          // This allows resize until property key + 3px, values will overflow
          const propertyKeyWidth = (prop.label.length * 8) + 60 + 3; // label + min-w-[60px] + 3px
          maxPropertyWidth = Math.max(maxPropertyWidth, propertyKeyWidth);
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
          // Calculate width based on property key (name) only, ignoring value length
          // This allows resize until property key + 3px, values will overflow
          const propertyKeyWidth = (propName.length * 8) + 60 + 3; // name + min-w-[60px] + 3px
          maxPropertyWidth = Math.max(maxPropertyWidth, propertyKeyWidth);
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
    // Remove explicit height to allow natural sizing when editing header
    updateNodeDimensions(id, currentWidth, undefined);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  }, [label, id, currentWidth, updateNodeDimensions]);

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
    // Remove explicit height to allow natural sizing without auto-resizing
    updateNodeDimensions(id, currentWidth, undefined);
  }, [id, currentWidth, updateNodeDimensions]);

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
    // Try to get renderer from registry first
    const renderer = getPropertyRenderer(nodeType);
    if (renderer) {
      return renderer({
        renderData,
        handlePropertyChange,
        handleOpenPopup,
        renderPropertyRow,
        setShowCapabilitiesPopup,
        setShowMarkdownEditor,
        setShowSetConfigModal,
        setSetConfigJsonValue,
        setSetConfigOriginalJsonValue,
        setSetConfigJsonError,
        id,
        storeNodes: nodesRaw,
        setSelectedNode,
      });
    }
    
    // All standard node types are now handled by the registry
    // Fallback switch statement removed - all cases extracted to propertyRenderers/

    // Plugin nodes (generic handling)
    const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
    if (pluginNode && pluginNode.definition.defaultData) {
      const properties = Object.keys(pluginNode.definition.defaultData);
      
      // Generic plugin node handling
      return (
        <div className="mt-2 space-y-1">
          {properties.map((key) => {
            const value = latestNodeData[key] ?? pluginNode.definition.defaultData![key];
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
    renderData.action, // Include action for nodes that use it (ACTION, CONTEXT_MANIPULATE, etc.)
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
          // Special styling for setConfig.setConfig with orange border
          if (nodeType === 'setConfig.setConfig') {
            return (
              <div className="flex-shrink-0 p-0.5 rounded border-2 border-orange-500">
                <IconComponent sx={{ fontSize: '1rem', color: icon.color }} />
              </div>
            );
          }
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
            title={`${label}${isReusableNode && renderData.contextName ? ` (${renderData.contextName})` : ''}${isRunReusableNode && renderData.contextName ? ` → ${renderData.contextName}` : ''}${isEndNode ? ' (End)' : ''}${bypass ? ' (bypassed)' : ''}${failSilently ? ' (failSilently)' : ''}${breakpoint ? ' (breakpoint)' : ''}${!isTest ? ' (support)' : ''} | Double-click to rename`}
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
            {breakpoint && <span className="ml-2 text-xs text-orange-500">(breakpoint)</span>}
            {!isTest && <span className="ml-2 text-xs text-gray-400">(support)</span>}
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
      {/* Render Set Config Modal via portal (Monaco editor for setConfig nodes) */}
      {showSetConfigModal && nodeType === 'setConfig.setConfig' && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseSetConfigModal();
            }
          }}
          onKeyDown={(e) => {
            // Prevent backspace from propagating
            if (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div 
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Edit Config</h2>
              <button
                onClick={handleCloseSetConfigModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              <div className="mb-4">
                <div className="bg-gray-900 border border-gray-700 rounded overflow-hidden" style={{ minHeight: '400px' }}>
                  <Editor
                    height="400px"
                    language="json"
                    value={setConfigJsonValue}
                    onChange={(value) => {
                      setSetConfigJsonValue(value || '{}');
                      setSetConfigJsonError(null);
                    }}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      readOnly: false,
                    }}
                    loading={
                      <div className="flex items-center justify-center h-[400px] text-gray-400">
                        Loading editor...
                      </div>
                    }
                  />
                </div>
                {setConfigJsonError && (
                  <div className="mt-2">
                    <div className="text-sm text-red-400 font-medium mb-1">Validation Errors:</div>
                    <div className="text-sm text-red-400 whitespace-pre-wrap break-words">
                      {setConfigJsonError.split('\n').map((error, index) => (
                        <div key={index} className="mb-1">
                          • {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Enter valid JSON object. Press Escape to cancel.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={handleCloseSetConfigModal}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  try {
                    const trimmedJson = setConfigJsonValue.trim();
                    const parsed = JSON.parse(trimmedJson);
                    
                    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                      setSetConfigJsonError('Config must be a JSON object');
                      return;
                    }

                    // Validate paths for duplicates and conflicts
                    const validation = validateConfigPaths(trimmedJson, parsed);
                    if (!validation.isValid) {
                      const errorMessage = validation.errors.join('\n');
                      setSetConfigJsonError(errorMessage);
                      return;
                    }

                    handlePropertyChange('config', parsed);
                    setSetConfigJsonError(null);
                    // Update original value to current saved value
                    setSetConfigOriginalJsonValue(trimmedJson);
                    setShowSetConfigModal(false);
                  } catch (error: any) {
                    setSetConfigJsonError(`Invalid JSON: ${error.message}`);
                  }
                }}
                disabled={!!setConfigJsonError}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
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
