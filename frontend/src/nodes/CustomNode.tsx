import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
import { useWorkflowStore } from '../store/workflowStore';
import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea, InlineCheckbox } from '../components/InlinePropertyEditor';
import NodeMenuBar from '../components/NodeMenuBar';

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
  const isExecuting = data.isExecuting || false;
  const nodeType = data.type as NodeType | string;
  const customLabel = data.label;
  const defaultLabel = getNodeLabel(nodeType);
  const label = customLabel || defaultLabel;
  const icon = getNodeIcon(nodeType);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNodeDimensions = useWorkflowStore((state) => state.updateNodeDimensions);
  const renameNode = useWorkflowStore((state) => state.renameNode);
  const autoResizeNode = useWorkflowStore((state) => state.autoResizeNode);
  const edges = useWorkflowStore((state) => state.edges);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(label);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [connectingHandleId, setConnectingHandleId] = useState<string | null>(null);
  
  // Check if this handle has an incoming/outgoing connection
  const hasInputConnection = edges.some(e => e.target === id && e.targetHandle === 'input');
  const hasOutputConnection = edges.some(e => e.source === id && e.sourceHandle === 'output');

  const currentWidth = width || data.width || 200;
  const currentHeight = height || data.height || undefined;
  const isMinimized = data.isMinimized || false;
  const bypass = data.bypass || false;
  // Use custom background color if set, otherwise use default
  const backgroundColor = data.backgroundColor || '#1f2937';
  // Border color is based on selection state, not customizable
  const borderColor = selected ? '#3b82f6' : '#4b5563';

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


  const renderProperties = () => {
    if (Object.values(NodeType).includes(nodeType as NodeType)) {
      switch (nodeType as NodeType) {
        case NodeType.START:
          return null;
        
        case NodeType.NAVIGATE:
          return (
            <div className="mt-2 space-y-1">
              <InlineTextInput
                label="URL"
                value={data.url || ''}
                onChange={(value) => handlePropertyChange('url', value)}
                placeholder="https://example.com"
              />
              <InlineNumberInput
                label="Timeout"
                value={data.timeout || 30000}
                onChange={(value) => handlePropertyChange('timeout', value)}
                placeholder="30000"
              />
              <InlineSelect
                label="Wait Until"
                value={data.waitUntil || 'networkidle'}
                onChange={(value) => handlePropertyChange('waitUntil', value)}
                options={[
                  { label: 'load', value: 'load' },
                  { label: 'domcontentloaded', value: 'domcontentloaded' },
                  { label: 'networkidle', value: 'networkidle' },
                  { label: 'commit', value: 'commit' },
                ]}
              />
              <InlineTextInput
                label="Referer"
                value={data.referer || ''}
                onChange={(value) => handlePropertyChange('referer', value)}
                placeholder="https://example.com (optional)"
              />
              <InlineCheckbox
                label="Fail Silently"
                value={data.failSilently || false}
                onChange={(value) => handlePropertyChange('failSilently', value)}
              />
            </div>
          );
        
        case NodeType.CLICK:
          return (
            <div className="mt-2 space-y-1">
              <InlineSelect
                label="Selector Type"
                value={data.selectorType || 'css'}
                onChange={(value) => handlePropertyChange('selectorType', value)}
                options={[
                  { label: 'CSS', value: 'css' },
                  { label: 'XPath', value: 'xpath' },
                ]}
              />
              <InlineTextInput
                label="Selector"
                value={data.selector || ''}
                onChange={(value) => handlePropertyChange('selector', value)}
                placeholder="#button or //button[@id='button']"
              />
              <InlineNumberInput
                label="Timeout"
                value={data.timeout || 30000}
                onChange={(value) => handlePropertyChange('timeout', value)}
                placeholder="30000"
              />
              <InlineCheckbox
                label="Fail Silently"
                value={data.failSilently || false}
                onChange={(value) => handlePropertyChange('failSilently', value)}
              />
            </div>
          );
        
        case NodeType.TYPE:
          return (
            <div className="mt-2 space-y-1">
              <InlineSelect
                label="Selector Type"
                value={data.selectorType || 'css'}
                onChange={(value) => handlePropertyChange('selectorType', value)}
                options={[
                  { label: 'CSS', value: 'css' },
                  { label: 'XPath', value: 'xpath' },
                ]}
              />
              <InlineTextInput
                label="Selector"
                value={data.selector || ''}
                onChange={(value) => handlePropertyChange('selector', value)}
                placeholder="#input or //input[@id='input']"
              />
              <InlineTextarea
                label="Text"
                value={data.text || ''}
                onChange={(value) => handlePropertyChange('text', value)}
                placeholder="Text to type"
              />
              <InlineNumberInput
                label="Timeout"
                value={data.timeout || 30000}
                onChange={(value) => handlePropertyChange('timeout', value)}
                placeholder="30000"
              />
              <InlineCheckbox
                label="Fail Silently"
                value={data.failSilently || false}
                onChange={(value) => handlePropertyChange('failSilently', value)}
              />
            </div>
          );
        
        case NodeType.GET_TEXT:
          return (
            <div className="mt-2 space-y-1">
              <InlineSelect
                label="Selector Type"
                value={data.selectorType || 'css'}
                onChange={(value) => handlePropertyChange('selectorType', value)}
                options={[
                  { label: 'CSS', value: 'css' },
                  { label: 'XPath', value: 'xpath' },
                ]}
              />
              <InlineTextInput
                label="Selector"
                value={data.selector || ''}
                onChange={(value) => handlePropertyChange('selector', value)}
                placeholder="#element or //div[@class='text']"
              />
              <InlineTextInput
                label="Output Var"
                value={data.outputVariable || 'text'}
                onChange={(value) => handlePropertyChange('outputVariable', value)}
                placeholder="text"
              />
              <InlineNumberInput
                label="Timeout"
                value={data.timeout || 30000}
                onChange={(value) => handlePropertyChange('timeout', value)}
                placeholder="30000"
              />
              <InlineCheckbox
                label="Fail Silently"
                value={data.failSilently || false}
                onChange={(value) => handlePropertyChange('failSilently', value)}
              />
            </div>
          );
        
        case NodeType.SCREENSHOT:
          return (
            <div className="mt-2 space-y-1">
              <InlineCheckbox
                label="Full Page"
                value={data.fullPage || false}
                onChange={(value) => handlePropertyChange('fullPage', value)}
              />
              <InlineTextInput
                label="Path"
                value={data.path || ''}
                onChange={(value) => handlePropertyChange('path', value)}
                placeholder="screenshot.png (optional)"
              />
              <InlineCheckbox
                label="Fail Silently"
                value={data.failSilently || false}
                onChange={(value) => handlePropertyChange('failSilently', value)}
              />
            </div>
          );
        
        case NodeType.WAIT:
          return (
            <div className="mt-2 space-y-1">
              <InlineSelect
                label="Wait Type"
                value={data.waitType || 'timeout'}
                onChange={(value) => handlePropertyChange('waitType', value)}
                options={[
                  { label: 'Timeout', value: 'timeout' },
                  { label: 'Selector', value: 'selector' },
                ]}
              />
              {data.waitType === 'timeout' ? (
                <InlineNumberInput
                  label="Value (ms)"
                  value={typeof data.value === 'number' ? data.value : parseInt(String(data.value || 1000), 10)}
                  onChange={(value) => handlePropertyChange('value', value)}
                  placeholder="1000"
                />
              ) : (
                <>
                  <InlineSelect
                    label="Selector Type"
                    value={data.selectorType || 'css'}
                    onChange={(value) => handlePropertyChange('selectorType', value)}
                    options={[
                      { label: 'CSS', value: 'css' },
                      { label: 'XPath', value: 'xpath' },
                    ]}
                  />
                  <InlineTextInput
                    label="Selector"
                    value={typeof data.value === 'string' ? data.value : ''}
                    onChange={(value) => handlePropertyChange('value', value)}
                    placeholder="#element or //div[@class='element']"
                  />
                  <InlineNumberInput
                    label="Timeout"
                    value={data.timeout || 30000}
                    onChange={(value) => handlePropertyChange('timeout', value)}
                    placeholder="30000"
                  />
                </>
              )}
              <InlineCheckbox
                label="Fail Silently"
                value={data.failSilently || false}
                onChange={(value) => handlePropertyChange('failSilently', value)}
              />
            </div>
          );
        
        case NodeType.JAVASCRIPT_CODE:
          return (
            <div className="mt-2 space-y-1">
              <InlineTextarea
                label="Code"
                value={data.code || ''}
                onChange={(value) => handlePropertyChange('code', value)}
                placeholder="// Your code here"
              />
              <InlineCheckbox
                label="Fail Silently"
                value={data.failSilently || false}
                onChange={(value) => handlePropertyChange('failSilently', value)}
              />
            </div>
          );
        
        case NodeType.LOOP:
          return (
            <div className="mt-2 space-y-1">
              <InlineTextInput
                label="Array Var"
                value={data.arrayVariable || ''}
                onChange={(value) => handlePropertyChange('arrayVariable', value)}
                placeholder="items (variable name)"
              />
              <InlineCheckbox
                label="Fail Silently"
                value={data.failSilently || false}
                onChange={(value) => handlePropertyChange('failSilently', value)}
              />
            </div>
          );
        
        case NodeType.OPEN_BROWSER:
          return (
            <div className="mt-2 space-y-1">
              <InlineCheckbox
                label="Headless"
                value={data.headless !== false}
                onChange={(value) => handlePropertyChange('headless', value)}
              />
              <InlineNumberInput
                label="Width"
                value={data.viewportWidth || 1280}
                onChange={(value) => handlePropertyChange('viewportWidth', value)}
                placeholder="1280"
              />
              <InlineNumberInput
                label="Height"
                value={data.viewportHeight || 720}
                onChange={(value) => handlePropertyChange('viewportHeight', value)}
                placeholder="720"
              />
              <InlineTextInput
                label="User Agent"
                value={data.userAgent || ''}
                onChange={(value) => handlePropertyChange('userAgent', value)}
                placeholder="Mozilla/5.0... (optional)"
              />
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

  const properties = renderProperties();
  const hasProperties = properties !== null;

  // Build style object with colors
  const nodeStyle: React.CSSProperties = {
    width: currentWidth,
    height: currentHeight,
    minWidth: 150,
    minHeight: hasProperties && !isMinimized ? undefined : 50,
    backgroundColor: backgroundColor,
    borderColor: isExecuting ? '#22c55e' : borderColor,
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
          nodeId={id}
          bypass={bypass}
          failSilently={data.failSilently}
          isMinimized={isMinimized}
        />
      )}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={`transition-all duration-200 ${
          connectingHandleId === 'input' 
            ? 'connecting' 
            : hasInputConnection 
              ? '!bg-green-500 hover:!bg-green-400' 
              : '!bg-blue-500 hover:!bg-blue-400'
        }`}
        style={{ 
          display: nodeType === NodeType.START || nodeType === 'start' ? 'none' : 'block'
        }}
        onMouseEnter={() => setConnectingHandleId('input')}
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
