import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType, PropertyDataType } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
import { useWorkflowStore } from '../store/workflowStore';
import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea, InlineCheckbox } from '../components/InlinePropertyEditor';
import NodeMenuBar from '../components/NodeMenuBar';
import { getNodeProperties, isPropertyInputConnection, getPropertyInputHandleId } from '../utils/nodeProperties';

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
  // Stabilize data prop by comparing content, not reference
  // This prevents infinite loops when ReactFlow recreates data objects with same content
  // Use a more stable comparison - compare key properties instead of JSON.stringify
  const dataRef = useRef(data);
  const dataKeyRef = useRef<string>('');
  
  // Create a stable key from data properties (sorted for consistency)
  // Include _inputConnections to detect when properties are converted to inputs
  // Include backgroundColor to detect when color changes
  const inputConnectionsKey = data._inputConnections ? JSON.stringify(data._inputConnections) : '';
  const backgroundColorKey = data.backgroundColor || '';
  const currentDataKey = `${data.type}|${data.label || ''}|${data.code || ''}|${data.width || ''}|${data.height || ''}|${inputConnectionsKey}|${backgroundColorKey}`;
  const dataContentChanged = dataKeyRef.current !== currentDataKey;
  
  if (dataContentChanged) {
    dataRef.current = data;
    dataKeyRef.current = currentDataKey;
  }
  
  // Use stable data reference that only changes when content changes
  const stableData = dataRef.current;
  
  const nodeType = stableData.type as NodeType | string;
  
  // #region agent log
  if (nodeType === NodeType.JAVASCRIPT_CODE && dataContentChanged && dataKeyRef.current !== '') {
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CustomNode.tsx:data-changed',message:'Data key changed',data:{nodeId:id,oldKey:dataKeyRef.current.substring(0,100),newKey:currentDataKey.substring(0,100),typeChanged:dataKeyRef.current.split('|')[0]!==currentDataKey.split('|')[0],labelChanged:dataKeyRef.current.split('|')[1]!==currentDataKey.split('|')[1],codeChanged:dataKeyRef.current.split('|')[2]!==currentDataKey.split('|')[2],widthChanged:dataKeyRef.current.split('|')[3]!==currentDataKey.split('|')[3],heightChanged:dataKeyRef.current.split('|')[4]!==currentDataKey.split('|')[4]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
  }
  // #endregion
  const customLabel = stableData.label;
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
  
  // #region agent log
  const isJavaScriptNode = nodeType === NodeType.JAVASCRIPT_CODE;
  if (isJavaScriptNode && (edgesChanged || nodesChanged || dataContentChanged)) {
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CustomNode.tsx:store-read',message:'Store/props changed',data:{nodeId:id,edgesChanged,edgesLength:edges.length,edgesLengthPrev:edgesRef.current.length,nodesChanged,nodesLength:nodes.length,nodesLengthPrev:nodesRef.current.length,dataContentChanged,codeChanged:dataRef.current?.code!==data.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
  }
  if (isJavaScriptNode) {
    fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CustomNode.tsx:render',message:'JavaScript node rendering',data:{nodeId:id,selected,width,height,hasCode:!!stableData.code,codeLength:stableData.code?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
  }
  // #endregion

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

  // Helper to check if property is converted to input
  const isPropertyInput = useCallback((propertyName: string) => {
    return isPropertyInputConnection(stableData, propertyName);
  }, [stableData]);

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
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0 flex items-center gap-1">
              <span className="text-blue-400">→</span>
              {propertySchema?.label || propertyName}
            </span>
          </>
        )}
        {/* Property editor - hide if converted to input */}
        {!isInput && (
          <div className="flex-1">
            {propertyElement}
          </div>
        )}
        {isInput && (
          <div className={`flex-1 text-xs ${hasConnection ? 'text-gray-300' : 'text-gray-500 italic'}`}>
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
  }, [id, edgesForThisNode, sourceNodes, isPropertyInput, connectingHandleId, nodeType, setConnectingHandleId]);

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
                  value={stableData.url || ''}
                  onChange={(value) => handlePropertyChange('url', value)}
                  placeholder="https://example.com"
                />
              ), 0)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={stableData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
                />
              ), 1)}
              {renderPropertyRow('waitUntil', (
                <InlineSelect
                  label="Wait Until"
                  value={stableData.waitUntil || 'networkidle'}
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
                  value={stableData.referer || ''}
                  onChange={(value) => handlePropertyChange('referer', value)}
                  placeholder="https://example.com (optional)"
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
                  placeholder="#button or //button[@id='button']"
                />
              ), 1)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={stableData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
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
                  placeholder="#input or //input[@id='input']"
                />
              ), 1)}
              {renderPropertyRow('text', (
                <InlineTextarea
                  label="Text"
                  value={stableData.text || ''}
                  onChange={(value) => handlePropertyChange('text', value)}
                  placeholder="Text to type"
                />
              ), 2)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={stableData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
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
                />
              ), 1)}
              {renderPropertyRow('outputVariable', (
                <InlineTextInput
                  label="Output Var"
                  value={stableData.outputVariable || 'text'}
                  onChange={(value) => handlePropertyChange('outputVariable', value)}
                  placeholder="text"
                />
              ), 2)}
              {renderPropertyRow('timeout', (
                <InlineNumberInput
                  label="Timeout"
                  value={stableData.timeout || 30000}
                  onChange={(value) => handlePropertyChange('timeout', value)}
                  placeholder="30000"
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
                  value={stableData.fullPage || false}
                  onChange={(value) => handlePropertyChange('fullPage', value)}
                />
              ), 0)}
              {renderPropertyRow('path', (
                <InlineTextInput
                  label="Path"
                  value={stableData.path || ''}
                  onChange={(value) => handlePropertyChange('path', value)}
                  placeholder="screenshot.png (optional)"
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
                  value={stableData.waitType || 'timeout'}
                  onChange={(value) => handlePropertyChange('waitType', value)}
                  options={[
                    { label: 'Timeout', value: 'timeout' },
                    { label: 'Selector', value: 'selector' },
                  ]}
                />
              ), 0)}
              {data.waitType === 'timeout' ? (
                renderPropertyRow('value', (
                  <InlineNumberInput
                    label="Value (ms)"
                    value={typeof data.value === 'number' ? data.value : parseInt(String(data.value || 1000), 10)}
                    onChange={(value) => handlePropertyChange('value', value)}
                    placeholder="1000"
                  />
                ), 1)
              ) : (
                <>
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
                  ), 1)}
                  {renderPropertyRow('value', (
                    <InlineTextInput
                      label="Selector"
                      value={typeof data.value === 'string' ? data.value : ''}
                      onChange={(value) => handlePropertyChange('value', value)}
                      placeholder="#element or //div[@class='element']"
                    />
                  ), 2)}
                  {renderPropertyRow('timeout', (
                    <InlineNumberInput
                      label="Timeout"
                      value={stableData.timeout || 30000}
                      onChange={(value) => handlePropertyChange('timeout', value)}
                      placeholder="30000"
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
                  value={stableData.code || ''}
                  onChange={(value) => handlePropertyChange('code', value)}
                  placeholder="// Your code here"
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
                  value={stableData.arrayVariable || ''}
                  onChange={(value) => handlePropertyChange('arrayVariable', value)}
                  placeholder="items (variable name)"
                />
              ), 0)}
            </div>
          );
        
        case NodeType.OPEN_BROWSER:
          return (
            <div className="mt-2 space-y-1">
              {renderPropertyRow('headless', (
                <InlineCheckbox
                  label="Headless"
                  value={stableData.headless !== false}
                  onChange={(value) => handlePropertyChange('headless', value)}
                />
              ), 0)}
              {renderPropertyRow('viewportWidth', (
                <InlineNumberInput
                  label="Width"
                  value={stableData.viewportWidth || 1280}
                  onChange={(value) => handlePropertyChange('viewportWidth', value)}
                  placeholder="1280"
                />
              ), 1)}
              {renderPropertyRow('viewportHeight', (
                <InlineNumberInput
                  label="Height"
                  value={stableData.viewportHeight || 720}
                  onChange={(value) => handlePropertyChange('viewportHeight', value)}
                  placeholder="720"
                />
              ), 2)}
              {renderPropertyRow('userAgent', (
                <InlineTextInput
                  label="User Agent"
                  value={stableData.userAgent || ''}
                  onChange={(value) => handlePropertyChange('userAgent', value)}
                  placeholder="Mozilla/5.0... (optional)"
                />
              ), 3)}
            </div>
          );
        
        case NodeType.INT_VALUE:
          return (
            <div className="mt-2 space-y-1">
              <InlineNumberInput
                label="Value"
                value={data.value ?? 0}
                onChange={(value) => handlePropertyChange('value', value)}
                placeholder="0"
              />
            </div>
          );
        
        case NodeType.STRING_VALUE:
          return (
            <div className="mt-2 space-y-1">
              <InlineTextInput
                label="Value"
                value={data.value ?? ''}
                onChange={(value) => handlePropertyChange('value', value)}
                placeholder="Enter string value"
              />
            </div>
          );
        
        case NodeType.BOOLEAN_VALUE:
          return (
            <div className="mt-2 space-y-1">
              <InlineSelect
                label="Value"
                value={String(data.value ?? false)}
                onChange={(value) => handlePropertyChange('value', value === 'true')}
                options={[
                  { label: 'True', value: 'true' },
                  { label: 'False', value: 'false' },
                ]}
              />
            </div>
          );
        
        case NodeType.INPUT_VALUE:
          const inputDataType = stableData.dataType || PropertyDataType.STRING;
          const inputValue = stableData.value ?? (inputDataType === PropertyDataType.BOOLEAN ? false : inputDataType === PropertyDataType.INT ? 0 : '');
          
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
                />
              )}
              {(inputDataType === PropertyDataType.INT || inputDataType === PropertyDataType.FLOAT || inputDataType === PropertyDataType.DOUBLE) && (
                <InlineNumberInput
                  label="Value"
                  value={typeof inputValue === 'number' ? inputValue : parseFloat(String(inputValue)) || 0}
                  onChange={(value) => handlePropertyChange('value', value)}
                  placeholder="0"
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
                />
              );
            } else {
              return (
                <InlineTextInput
                  key={key}
                  label={key}
                  value={String(value || '')}
                  onChange={(val) => handlePropertyChange(key, val)}
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
  const properties = useMemo(() => renderProperties(), [
    nodeType, 
    stableData.code, 
    stableData.url,
    stableData.selector,
    stableData.text,
    edgesForThisNode.length,
    sourceNodes.length,
    connectingHandleId,
    inputConnectionsForMemo,
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
            className="text-sm font-medium text-white bg-gray-700 border border-gray-600 rounded px-2 py-0.5 flex-1 min-w-0"
            style={{ color: 'white' }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="text-sm font-medium text-white cursor-text"
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
