import { PropertyRenderer } from './types';
import { frontendPluginRegistry } from '../../../plugins/registry';

export const renderSwitchProperties: PropertyRenderer = ({ renderData }) => {
  const nodeType = renderData.type as string;
  const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
  
  if (!pluginNode || !pluginNode.definition.defaultData) {
    return null;
  }
  
  const cases = renderData.cases || [];
  const defaultCase = renderData.defaultCase || { label: 'Default' };
  
  return (
    <div className="mt-2 space-y-1">
      <div className="text-xs text-gray-400">
        {cases.length} case{cases.length !== 1 ? 's' : ''} configured
      </div>
      {cases.length > 0 && (
        <div className="text-xs text-gray-400">
          Cases: {cases.map((c: any) => c.label || c.id).join(', ')}
        </div>
      )}
      <div className="text-xs text-gray-400">
        Default: {defaultCase.label || 'Default'}
      </div>
      <div className="text-xs text-gray-500 italic mt-1">
        Use the config panel to edit cases
      </div>
    </div>
  );
};
