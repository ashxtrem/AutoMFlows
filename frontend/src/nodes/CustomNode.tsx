import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { shallow } from 'zustand/shallow';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType, PropertyDataType, OpenBrowserNodeData } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
import { useWorkflowStore } from '../store/workflowStore';
import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea, InlineCheckbox } from '../components/InlinePropertyEditor';
import NodeMenuBar from '../components/NodeMenuBar';
import CapabilitiesPopup from '../components/CapabilitiesPopup';
import PropertyEditorPopup, { PropertyEditorType } from '../components/PropertyEditorPopup';
import { getNodeProperties, isPropertyInputConnection, getPropertyInputHandleId } from '../utils/nodeProperties';
import { getContrastTextColor } from '../utils/colorContrast';

const nodeIcons: Record<NodeType, string> = {
  [NodeType.START]: '🚀',
  [NodeType.OPEN_BROWSER]: '🌐',
  [NodeType.NAVIGATE]: '🔗',
  [NodeType.CLICK]: '👆',
  [NodeType.TYPE]: '⌨️',
  [NodeType.GET_TEXT]: '📝',
  [NodeType.SCREENSHOT]: '📸',
  [NodeType.WAIT]: '⏱️',
  [NodeType.JAVASCRIPT_CODE]: '💻',
  [NodeType.LOOP]: '🔁',
  [NodeType.INT_VALUE]: '🔢',
  [NodeType.STRING_VALUE]: '📄',
  [NodeType.BOOLEAN_VALUE]: '✓',
  [NodeType.INPUT_VALUE]: '📥',
};

function getNodeIcon(nodeType: NodeType | string): string {
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    return nodeIcons[nodeType as NodeType] || '📦';
  }
  
  const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
  if (pluginNode && pluginNode.icon) {
    return pluginNode.icon;
  }
  
  return '📦';
}

function getNodeLabel(type: NodeType | string): string {
  if (Object.values(NodeType).includes(type as NodeType)) {
    const labels: Record<NodeType, string> = {
      [NodeType.START]: 'Start',
      [NodeType.OPEN_BROWSER]: 'Open Browser',
      [NodeType.NAVIGATE]: 'Navigate',
      [NodeType.CLICK]: 'Click',
      [NodeType.TYPE]: 'Type',
      [NodeType.GET_TEXT]: 'Get Text',
      [NodeType.SCREENSHOT]: 'Screenshot',
      [NodeType.WAIT]: 'Wait',
      [NodeType.JAVASCRIPT_CODE]: 'JavaScript Code',
      [NodeType.LOOP]: 'Loop',
      [NodeType.INT_VALUE]: 'Int Value',
      [NodeType.STRING_VALUE]: 'String Value',
      [NodeType.BOOLEAN_VALUE]: 'Boolean Value',
      [NodeType.INPUT_VALUE]: 'Input Value',
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

export default function CustomNode({ id, data, selected, width, height }: NodeProps) {
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
  
  // Get latest node data from store to avoid stale prop issues
  const storeNodes = useWorkflowStore((state) => state.nodes);
  const latestNodeData = storeNodes.find(n => n.id === id)?.data || data;
  
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
  // Include url and timeout for NAVIGATE nodes, selector/timeout for CLICK/GET_TEXT nodes
  const navigateDataKey = latestNodeData.type === NodeType.NAVIGATE 
    ? `|url:${latestNodeData.url || ''}|timeout:${latestNodeData.timeout || ''}|waitUntil:${latestNodeData.waitUntil || ''}|referer:${latestNodeData.referer || ''}` 
    : '';
  const clickDataKey = latestNodeData.type === NodeType.CLICK 
    ? `|selector:${latestNodeData.selector || ''}|timeout:${latestNodeData.timeout || ''}` 
    : '';
  const getTextDataKey = latestNodeData.type === NodeType.GET_TEXT 
    ? `|selector:${latestNodeData.selector || ''}|timeout:${latestNodeData.timeout || ''}|outputVariable:${latestNodeData.outputVariable || ''}` 
    : '';
  const currentDataKey = `${latestNodeData.type}|${latestNodeData.label || ''}|${latestNodeData.code || ''}|${latestNodeData.width || ''}|${latestNodeData.height || ''}|${inputConnectionsKey}|${backgroundColorKey}|isMinimized:${isMinimizedKey}|bypass:${bypassKey}|failSilently:${failSilentlyKey}${valueKey}${dataTypeKey}${browserDataKey}${navigateDataKey}${clickDataKey}${getTextDataKey}`;
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
  const [dataVersion, setDataVersion] = useState(0);
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
        isMinimized: node?.data?.isMinimized || false,
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
  const executingNodeId = useWorkflowStore((state) => state.executingNodeId);
  const isFailed = failedNodes.has(id);
  // Read isExecuting directly from store instead of node data to avoid triggering ReactFlow sync
  const isExecuting = executingNodeId === id;

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(label);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [connectingHandleId, setConnectingHandleId] = useState<string | null>(null);
  
  // Check if this handle has an incoming/outgoing connection
  const hasDriverConnection = edgesRaw.some(e => e.target === id && e.targetHandle === 'driver');
  const hasOutputConnection = edgesRaw.some(e => e.source === id && e.sourceHandle === 'output');
  
  // Get property input connections
  const inputConnections = stableData._inputConnections || {};
  const propertyInputHandles = Object.keys(inputConnections).filter(prop => inputConnections[prop]?.isInput === true);

  const currentWidth = width || stableData.width || 200;
  const currentHeight = height || stableData.height || undefined;
  // Use node-specific data from store selector to ensure we always get latest values
  // This avoids ReactFlow sync delays and ensures immediate updates
  const isMinimized = nodeDataFromStore.isMinimized;
  const bypass = nodeDataFromStore.bypass;
  const failSilently = nodeDataFromStore.failSilently;
  // Use custom background color if set, otherwise use default
  // Read directly from data prop (not stableData) to get real-time updates
  const backgroundColor = data.backgroundColor || '#1f2937';
  // Calculate optimal text color based on background color for contrast
  const textColor = getContrastTextColor(backgroundColor);
  // Border color: red if failed, blue if selected, default gray otherwise
  const borderColor = isFailed ? '#ef4444' : (selected ? '#3b82f6' : '#4b5563');

  // Calculate minimum dimensions based on content
  const calculateMinDimensions = useCallback(() => {
    // Minimum width: enough for label + icon + padding
    // Estimate label width: ~8px per character + icon (~24px) + padding (32px total)
    const labelWidth = (label.length * 8) + 24 + 32;
    const minWidth = Math.max(150, labelWidth);
    
    // Check if node has properties (without calling renderProperties to avoid circular dependency)
    let hasProps = false;
    let propertyCount = 0;
    
    if (Object.values(NodeType).includes(nodeType as NodeType)) {
      // Built-in nodes - check if they have properties
      hasProps = nodeType !== NodeType.START;
      if (hasProps) {
        propertyCount = Object.keys(data).filter(
          (key) => !['type', 'label', 'isExecuting', 'width', 'height', 'borderColor', 'backgroundColor', 'bypass', 'isMinimized'].includes(key)
        ).length;
      }
    } else {
      // Plugin nodes
      const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
      hasProps = pluginNode && pluginNode.definition.defaultData !== undefined;
      if (hasProps && pluginNode?.definition.defaultData) {
        propertyCount = Object.keys(pluginNode.definition.defaultData).length;
      }
    }
    
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

  // Helper to create popup handler with field name
  const createPopupHandler = useCallback((field: string) => {
    return (
      type: PropertyEditorType,
      label: string,
      value: any,
      onChange: (value: any) => void,
      placeholder?: string,
      min?: number,
      max?: number
    ) => {
      handleOpenPopup(type, label, value, onChange, placeholder, min, max, field);
    };
  }, [handleOpenPopup]);

  // Helper to check if property is converted to input
  const isPropertyInput = useCallback((propertyName: string) => {
    return isPropertyInputConnection(renderData, propertyName);
  }, [renderData]);

  // Helper to render property with conditional input handle
  const renderPropertyRow = useCallback((propertyName: string, propertyElement: React.ReactNode, propertyIndex: number) => {
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
      <div key={propertyName} className="relative flex items-center gap-2 min-h-[24px]">
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
                    ? '!bg-green-500 hover:!bg-green-400'
                    : isRequired && !hasConnection
                      ? '!bg-yellow-500 hover:!bg-yellow-400'
                      : '!bg-blue-500 hover:!bg-blue-400'
              }`}
              style={{
                position: 'absolute',
                left: '-6px',
                top: '50%',
                transform: 'translateY(-50%)',
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
          <div className="flex-1">
            {React.isValidElement(propertyElement) 
              ? React.cloneElement(propertyElement as React.ReactElement<any>, { field: propertyName })
              : propertyElement}
          </div>
        )}
        {isInput && (
          <div className={`flex-1 text-xs ${!hasConnection ? 'italic' : ''}`} style={{ color: textColor, opacity: hasConnection ? 0.9 : 0.6 }}>
            {hasConnection ? (
              <span className="flex items-center gap-1">
                <span className="text-green-400">●</span>
                <span className="truncate" title={sourceNodeLabel}>{sourceNodeLabel}</span>
              </span>
            ) : (
              <span>Not connected</span>
            )}
          </div>
        )}
      </div>
    );
  }, [id, edgesForThisNode, sourceNodes, isPropertyInput, connectingHandleId, nodeType, setConnectingHandleId, textColor]);

  const renderProperties = () => {
    if (Object.values(NodeType).includes(nodeType as NodeType)) {
      switch (nodeType as NodeType) {
        case NodeType.START:
          return null;
        
        case NodeType.NAVIGATE:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('url', (
                <InlineTextInput
                  label="URL"
                  value={renderData.url || ''}
                  onChange={(value) => handlePropertyChange('url', value)}
                  placeholder="https://example.com"
                  onOpenPopup={handleOpenPopup}
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
              {renderPropertyRow('waitUntil', (
                <InlineSelect
                  label="Wait Until"
                  value={renderData.waitUntil || 'networkidle'}
                  onChange={(value) => handlePropertyChange('waitUntil', value)}
                  options={[
                    { label: 'load', value: 'load' },
                    { label: 'domcontentloaded', value: 'domcontentloaded' },
                    { label: 'networkidle', value: 'networkidle' },
                    { label: 'commit', value: 'commit' },
                  ]}
                />
              ), 2)}
              {renderPropertyRow('referer', (
                <InlineTextInput
                  label="Referer"
                  value={renderData.referer || ''}
                  onChange={(value) => handlePropertyChange('referer', value)}
                  placeholder="https://example.com (optional)"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
            </div>
          );
        
        case NodeType.CLICK:
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
                  placeholder="#button or //button[@id='button']"
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
            </div>
          );
        
        case NodeType.GET_TEXT:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('selectorType', (
                <InlineSelect
                  label="Selector Type"
                  value={stableData.selectorType || 'css'}
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
                  value={stableData.selector || ''}
                  onChange={(value) => handlePropertyChange('selector', value)}
                  placeholder="#element or //div[@class='text']"
                  onOpenPopup={handleOpenPopup}
                />
              ), 1)}
              {renderPropertyRow('outputVariable', (
                <InlineTextInput
                  label="Output Var"
                  value={renderData.outputVariable || 'text'}
                  onChange={(value) => handlePropertyChange('outputVariable', value)}
                  placeholder="text"
                  onOpenPopup={handleOpenPopup}
                />
              ), 2)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={stableData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                  onOpenPopup={handleOpenPopup}
                />
              ), 3)}
            </div>
          );
        
        case NodeType.SCREENSHOT:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('fullPage', (
                <InlineCheckbox
                  label="Full Page"
                  value={renderData.fullPage || false}
                  onChange={(value) => handlePropertyChange('fullPage', value)}
                />
              ), 0)}
              {renderPropertyRow('path', (
                <InlineTextInput
                  label="Path"
                  value={renderData.path || ''}
                  onChange={(value) => handlePropertyChange('path', value)}
                  placeholder="screenshot.png (optional)"
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
              ) : (
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
              )}
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
                  onOpenPopup={(type, label, value, onChange, placeholder, min, max, field) => {
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
                    className="w-full px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-white transition-colors"
                  >
                    View/Add Options
                    {(capabilitiesCount > 0 || launchOptionsCount > 0) && (
                      <span className="ml-2 text-blue-400">
                        (C:{capabilitiesCount}, L:{launchOptionsCount})
                      </span>
                    )}
                  </button>
                </div>
                {renderPropertyRow('userAgent', (
                  <InlineTextInput
                    label="User Agent"
                    value={browserData.userAgent || ''}
                    onChange={(value) => handlePropertyChange('userAgent', value)}
                    placeholder="Mozilla/5.0... (optional)"
                    onOpenPopup={handleOpenPopup}
                  />
                ), 6)}
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
        
        default:
          return null;
      }
    }

    // Plugin nodes
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
    edgesForThisNode.length,
    sourceNodes.length,
    connectingHandleId,
    inputConnectionsForMemo,
    browserDataForMemo, // Include browser-specific data in dependencies
    valueForMemo, // Include value for value nodes
    dataTypeForMemo, // Include dataType for INPUT_VALUE nodes
  ]);
  const hasProperties = properties !== null;

  // Build style object with colors
  const nodeStyle: React.CSSProperties = {
    width: currentWidth,
    height: currentHeight,
    minWidth: 150,
    minHeight: hasProperties && !isMinimized ? undefined : 50,
    backgroundColor: backgroundColor,
    borderColor: isFailed ? '#ef4444' : (isExecuting ? '#22c55e' : borderColor),
    borderWidth: '2px',
    borderStyle: 'solid',
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
          key={`${id}-${bypass}-${nodeDataFromStore.failSilently}-${isMinimized}`}
          nodeId={id}
          bypass={bypass}
          failSilently={nodeDataFromStore.failSilently}
          isMinimized={isMinimized}
        />
      )}
      {/* Default control flow handle (driver) */}
      <Handle
        type="target"
        position={Position.Left}
        id="driver"
        className={`transition-all duration-200 ${
          connectingHandleId === 'driver' 
            ? 'connecting' 
            : hasDriverConnection 
              ? '!bg-green-500 hover:!bg-green-400' 
              : '!bg-blue-500 hover:!bg-blue-400'
        }`}
        style={{ 
          display: nodeType === NodeType.START || nodeType === 'start' ? 'none' : 'block',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        onMouseEnter={() => setConnectingHandleId('driver')}
        onMouseLeave={() => setConnectingHandleId(null)}
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
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
            className="text-sm font-medium cursor-text"
            style={{ color: textColor }}
            onDoubleClick={handleDoubleClickHeader}
            title="Double-click to rename"
          >
            {label}
            {bypass && <span className="ml-2 text-xs text-yellow-400">(bypassed)</span>}
            {failSilently && <span className="ml-2 text-xs text-orange-400">(failSilently)</span>}
          </div>
        )}
      </div>
      {hasProperties && !isMinimized && (
        <div className="mt-2 border-t border-gray-700 pt-2">
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
      {selected && (
        <ResizeHandle onResize={handleResize} />
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={`transition-all duration-200 ${
          connectingHandleId === 'output' 
            ? 'connecting' 
            : hasOutputConnection 
              ? '!bg-green-500 hover:!bg-green-400' 
              : '!bg-blue-500 hover:!bg-blue-400'
        }`}
        style={{ display: nodeType === NodeType.START ? 'block' : 'block' }}
        onMouseEnter={() => setConnectingHandleId('output')}
        onMouseLeave={() => setConnectingHandleId(null)}
      />
    </div>
  );
}
