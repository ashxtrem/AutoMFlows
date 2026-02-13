import { LoadConfigFileNodeData, SelectConfigFileNodeData } from '@automflows/shared';
import { PropertyRenderer } from './types';

export const renderLoadConfigFileProperties: PropertyRenderer = ({ renderData, id, storeNodes, setSelectedNode }) => {
  const configData = renderData as LoadConfigFileNodeData | SelectConfigFileNodeData;
  const configs = configData.configs || [];
  const hasConfigs = configs.length > 0;
  const activeConfigs = configs.filter(c => c.enabled).length;
  
  const handleOpenConfigSidebar = () => {
    // Get current node from store
    if (id && storeNodes && setSelectedNode) {
      const currentNode = storeNodes.find(n => n.id === id);
      if (currentNode) {
        setSelectedNode(currentNode);
      }
    }
  };
  
  return (
    <div className="mt-2 space-y-1">
      <div className="px-2 py-1">
        <button
          type="button"
          onClick={handleOpenConfigSidebar}
          className="w-full px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded text-white transition-colors"
        >
          {hasConfigs ? 'Add Config' : 'Load Config'}
        </button>
        {hasConfigs && (
          <p className="mt-1 text-xs text-gray-400 text-center">
            {configs.length} config{configs.length !== 1 ? 's' : ''} loaded ({activeConfigs} active)
          </p>
        )}
      </div>
    </div>
  );
};
