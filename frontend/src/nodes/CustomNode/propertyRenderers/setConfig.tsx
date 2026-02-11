import { PropertyRenderer } from './types';
import { InlineCheckbox, InlineNumberInput, InlineTextInput } from '../../../components/InlinePropertyEditor';
import { frontendPluginRegistry } from '../../../plugins/registry';

export const renderSetConfigProperties: PropertyRenderer = ({ 
  renderData, 
  handlePropertyChange, 
  handleOpenPopup,
  setShowSetConfigModal,
  setSetConfigJsonValue,
  setSetConfigOriginalJsonValue,
  setSetConfigJsonError
}) => {
  const nodeType = renderData.type as string;
  const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
  
  if (!pluginNode || !pluginNode.definition.defaultData) {
    return null;
  }
  
  const properties = Object.keys(pluginNode.definition.defaultData);
  const latestNodeData = renderData;
  
  return (
    <div className="mt-2 space-y-1">
      {properties.map((key) => {
        const value = latestNodeData[key] ?? pluginNode.definition.defaultData![key];
        const valueType = typeof value;
        
        // Special handling for 'config' property - show summary and open Monaco editor
        if (key === 'config' && valueType === 'object' && value !== null && !Array.isArray(value)) {
          const configKeys = Object.keys(value);
          const configSummary = configKeys.length > 0 
            ? `{${configKeys.length} key${configKeys.length !== 1 ? 's' : ''}: ${configKeys.slice(0, 3).join(', ')}${configKeys.length > 3 ? '...' : ''}}`
            : '{empty}';
          
          return (
            <div 
              key={key}
              className="flex items-center gap-1 cursor-pointer hover:bg-gray-700/50 rounded px-1 py-0.5 min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Initialize modal with current config
                try {
                  const jsonString = JSON.stringify(value, null, 2);
                  setSetConfigJsonValue?.(jsonString);
                  setSetConfigOriginalJsonValue?.(jsonString);
                  setSetConfigJsonError?.(null);
                } catch (error: any) {
                  setSetConfigJsonError?.(error.message);
                  setSetConfigJsonValue?.('{}');
                  setSetConfigOriginalJsonValue?.('{}');
                }
                setShowSetConfigModal?.(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="text-xs text-gray-400 min-w-[60px] flex-shrink-0">{key}:</span>
              <span className="text-xs text-gray-200 flex-1 truncate min-w-0" title={configSummary}>
                {configSummary}
              </span>
            </div>
          );
        }
        
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
};
