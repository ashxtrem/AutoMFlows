import { PropertyRenderer } from './types';
import { InlineTextInput } from '../../../components/InlinePropertyEditor';
import { frontendPluginRegistry } from '../../../plugins/registry';

export const renderReusableProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup }) => {
  const nodeType = renderData.type as string;
  const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
  
  if (!pluginNode || !pluginNode.definition.defaultData) {
    return null;
  }
  
  const properties = Object.keys(pluginNode.definition.defaultData);
  
  // reusable.end has empty defaultData, so show nothing
  if (properties.length === 0) {
    return (
      <div className="mt-2">
        <div className="text-xs text-gray-400 italic">
          No configuration needed
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-2 space-y-1">
      {properties.map((key) => {
        const value = renderData[key] ?? pluginNode.definition.defaultData![key];
        
        // For reusable nodes, we only have contextName (string)
        // Use InlineTextInput with popup functionality
        return (
          <InlineTextInput
            key={key}
            label={key === 'contextName' ? 'Context Name' : key}
            value={String(value || '')}
            onChange={(val) => handlePropertyChange(key, val)}
            placeholder={key === 'contextName' ? 'e.g., login, setup' : ''}
            field={key}
            onOpenPopup={handleOpenPopup}
          />
        );
      })}
    </div>
  );
};
