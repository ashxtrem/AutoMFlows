import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '@automflows/shared';
import { frontendPluginRegistry } from '../plugins/registry';
import { useWorkflowStore } from '../store/workflowStore';
import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea, InlineCheckbox } from '../components/InlinePropertyEditor';

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

interface ResizeHandleProps {
  onResize: (deltaX: number, deltaY: number) => void;
}

function ResizeHandle({ onResize }: ResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (startPos.current) {
        const deltaX = e.clientX - startPos.current.x;
        const deltaY = e.clientY - startPos.current.y;
        onResize(deltaX, deltaY);
        startPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      startPos.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResize]);

  return (
    <div
      className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 border-2 border-gray-800 rounded-tl-lg cursor-nwse-resize hover:bg-blue-400"
      onMouseDown={handleMouseDown}
      style={{ zIndex: 10 }}
    />
  );
}

export default function CustomNode({ id, data, selected, width, height }: NodeProps) {
  const isExecuting = data.isExecuting || false;
  const nodeType = data.type as NodeType | string;
  const label = data.label || nodeType;
  const icon = getNodeIcon(nodeType);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNodeDimensions = useWorkflowStore((state) => state.updateNodeDimensions);

  const currentWidth = width || data.width || 200;
  const currentHeight = height || data.height || undefined;

  const handleResize = useCallback((deltaX: number, deltaY: number) => {
    const newWidth = Math.max(150, currentWidth + deltaX);
    const newHeight = currentHeight ? Math.max(100, currentHeight + deltaY) : undefined;
    
    updateNodeDimensions(id, newWidth, newHeight);
  }, [id, currentWidth, currentHeight, updateNodeDimensions]);

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

  return (
    <div
      className={`relative px-4 py-3 bg-gray-800 border-2 rounded-lg shadow-lg ${
        selected ? 'border-blue-500' : 'border-gray-700'
      } ${isExecuting ? 'border-green-500 animate-pulse' : ''}`}
      style={{
        width: currentWidth,
        minWidth: 150,
        minHeight: hasProperties ? undefined : 50,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-blue-500 !border-2 !border-gray-800"
        style={{ display: nodeType === NodeType.START || nodeType === 'start' ? 'none' : 'block' }}
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div className="text-sm font-medium text-white">{label}</div>
      </div>
      {hasProperties && (
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
        className="!bg-blue-500 !border-2 !border-gray-800"
        style={{ display: nodeType === NodeType.START ? 'block' : 'block' }}
      />
    </div>
  );
}
