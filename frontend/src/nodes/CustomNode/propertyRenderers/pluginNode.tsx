import { InlineTextInput, InlineNumberInput, InlineCheckbox } from '../../../components/InlinePropertyEditor';
import { frontendPluginRegistry } from '../../../plugins/registry';
import { PropertyRenderer } from './types';

export const renderPluginNodeProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup }) => {
  const nodeType = renderData.type as string;
  const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
  
  if (!pluginNode || !pluginNode.definition.defaultData) {
    return null;
  }
  
  const properties = Object.keys(pluginNode.definition.defaultData);
  
  return (
    <div className="mt-2 space-y-1">
      {properties.map((key) => {
        const value = renderData[key] ?? pluginNode.definition.defaultData![key];
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
};
