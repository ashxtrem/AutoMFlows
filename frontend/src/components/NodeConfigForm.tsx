import { Node } from 'reactflow';
import { NodeType } from '@automflows/shared';
import { useWorkflowStore } from '../store/workflowStore';
import { isDeprecatedNodeType, getMigrationSuggestion } from '../utils/migration';
import OpenBrowserConfig from './nodeConfigs/OpenBrowserConfig';
import TypeConfig from './nodeConfigs/TypeConfig';
import ActionConfig from './nodeConfigs/ActionConfig';
import ElementQueryConfig from './nodeConfigs/ElementQueryConfig';
import FormInputConfig from './nodeConfigs/FormInputConfig';
import NavigationConfig from './nodeConfigs/NavigationConfig';
import KeyboardConfig from './nodeConfigs/KeyboardConfig';
import ScrollConfig from './nodeConfigs/ScrollConfig';
import StorageConfig from './nodeConfigs/StorageConfig';
import DialogConfig from './nodeConfigs/DialogConfig';
import DownloadConfig from './nodeConfigs/DownloadConfig';
import IframeConfig from './nodeConfigs/IframeConfig';
import ScreenshotConfig from './nodeConfigs/ScreenshotConfig';
import WaitConfig from './nodeConfigs/WaitConfig';
import JavaScriptCodeConfig from './nodeConfigs/JavaScriptCodeConfig';
import LoopConfig from './nodeConfigs/LoopConfig';
import IntValueConfig from './nodeConfigs/IntValueConfig';
import StringValueConfig from './nodeConfigs/StringValueConfig';
import BooleanValueConfig from './nodeConfigs/BooleanValueConfig';
import VerifyConfig from './nodeConfigs/VerifyConfig';
import ApiRequestConfig from './nodeConfigs/ApiRequestConfig';
import ApiCurlConfig from './nodeConfigs/ApiCurlConfig';
import LoadConfigFileConfig from './nodeConfigs/LoadConfigFileConfig';
import SelectConfigFileConfig from './nodeConfigs/SelectConfigFileConfig';
import { frontendPluginRegistry } from '../plugins/registry';
import { useCallback } from 'react';
// Import switch node config component directly (until plugin loader supports dynamic loading)
import SwitchConfig from '@plugins/switch-node/config';
// Import reusable node config components directly (until plugin loader supports dynamic loading)
import { ReusableConfig, RunReusableConfig } from '@plugins/reusable-node/config';

interface NodeConfigFormProps {
  node: Node;
}

export default function NodeConfigForm({ node }: NodeConfigFormProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const nodeType = node.data.type as NodeType | string;
  const isDeprecated = Object.values(NodeType).includes(nodeType as NodeType) && isDeprecatedNodeType(nodeType as NodeType);
  const migrationSuggestion = isDeprecated ? getMigrationSuggestion(nodeType as NodeType) : null;

  const handleChange = useCallback((field: string, value: any) => {
    updateNodeData(node.id, { [field]: value });
  }, [node.id, updateNodeData]);

  const renderConfig = () => {
    // Check if it's a built-in node type (check if value exists in enum values)
    if (Object.values(NodeType).includes(nodeType as NodeType)) {
      switch (nodeType as NodeType) {
        case NodeType.START:
          return <div className="text-gray-400 text-sm">Start node has no configuration.</div>;
        case NodeType.OPEN_BROWSER:
          return <OpenBrowserConfig node={node} onChange={handleChange} />;
        case NodeType.TYPE:
          return <TypeConfig node={node} onChange={handleChange} />;
        case NodeType.ACTION:
          return <ActionConfig node={node} onChange={handleChange} />;
        case NodeType.ELEMENT_QUERY:
          return <ElementQueryConfig node={node} onChange={handleChange} />;
        case NodeType.FORM_INPUT:
          return <FormInputConfig node={node} onChange={handleChange} />;
        case NodeType.NAVIGATION:
          return <NavigationConfig node={node} onChange={handleChange} />;
        case NodeType.KEYBOARD:
          return <KeyboardConfig node={node} onChange={handleChange} />;
        case NodeType.SCROLL:
          return <ScrollConfig node={node} onChange={handleChange} />;
        case NodeType.STORAGE:
          return <StorageConfig node={node} onChange={handleChange} />;
        case NodeType.DIALOG:
          return <DialogConfig node={node} onChange={handleChange} />;
        case NodeType.DOWNLOAD:
          return <DownloadConfig node={node} onChange={handleChange} />;
        case NodeType.IFRAME:
          return <IframeConfig node={node} onChange={handleChange} />;
        case NodeType.SCREENSHOT:
          return <ScreenshotConfig node={node} onChange={handleChange} />;
        case NodeType.WAIT:
          return <WaitConfig node={node} onChange={handleChange} />;
        case NodeType.JAVASCRIPT_CODE:
          return <JavaScriptCodeConfig node={node} onChange={handleChange} />;
        case NodeType.LOOP:
          return <LoopConfig node={node} onChange={handleChange} />;
        case NodeType.INT_VALUE:
          return <IntValueConfig node={node} onChange={handleChange} />;
        case NodeType.STRING_VALUE:
          return <StringValueConfig node={node} onChange={handleChange} />;
        case NodeType.BOOLEAN_VALUE:
          return <BooleanValueConfig node={node} onChange={handleChange} />;
        case NodeType.INPUT_VALUE:
          return <div className="text-gray-400 text-sm">Input Value node is configured directly on the node.</div>;
        case NodeType.VERIFY:
          return <VerifyConfig node={node} onChange={handleChange} />;
        case NodeType.API_REQUEST:
          return <ApiRequestConfig node={node} onChange={handleChange} />;
        case NodeType.API_CURL:
          return <ApiCurlConfig node={node} onChange={handleChange} />;
        case NodeType.LOAD_CONFIG_FILE:
          return <LoadConfigFileConfig node={node} onChange={handleChange} />;
        case NodeType.SELECT_CONFIG_FILE:
          return <SelectConfigFileConfig node={node} onChange={handleChange} />;
        default:
          return <div className="text-gray-400 text-sm">No configuration available.</div>;
      }
    }

    // Check if it's a plugin node
    const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
    if (pluginNode) {
      // Special handling for switch node (until plugin loader supports dynamic loading)
      if (nodeType === 'switch.switch') {
        return <SwitchConfig node={node} onChange={handleChange} />;
      }
      
      // Special handling for reusable nodes (until plugin loader supports dynamic loading)
      if (nodeType === 'reusable.reusable') {
        return <ReusableConfig node={node} onChange={handleChange} />;
      }
      if (nodeType === 'reusable.runReusable') {
        return <RunReusableConfig node={node} onChange={handleChange} />;
      }
      
      // If plugin has a custom config component, use it
      if (pluginNode.configComponent) {
        const ConfigComponent = pluginNode.configComponent;
        return <ConfigComponent node={node} onChange={handleChange} />;
      }
      
      // Otherwise, render a generic config form based on node definition
      const nodeDef = pluginNode.definition;
      if (nodeDef.defaultData) {
        return (
          <div className="space-y-4">
            <div className="text-gray-400 text-sm mb-4">{nodeDef.description || 'Configure this node'}</div>
            {Object.entries(nodeDef.defaultData).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {key}
                </label>
                <input
                  type="text"
                  value={node.data[key] || value || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                  placeholder={String(value)}
                />
              </div>
            ))}
          </div>
        );
      }
      
      return <div className="text-gray-400 text-sm">No configuration available for this plugin node.</div>;
    }

    return <div className="text-gray-400 text-sm">No configuration available.</div>;
  };

  return (
    <div className="space-y-4">
      {isDeprecated && migrationSuggestion && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div className="flex-1">
              <div className="text-yellow-400 font-semibold mb-1">Deprecated Node Type</div>
              <div className="text-yellow-300 text-sm mb-2">
                This node type is deprecated and will be removed in a future version.
              </div>
              <div className="text-yellow-200 text-sm">
                <strong>Migration:</strong> Use <code className="bg-gray-800 px-1 py-0.5 rounded">{migrationSuggestion.newType}</code> node with action="{migrationSuggestion.action}" instead.
              </div>
            </div>
          </div>
        </div>
      )}
      {renderConfig()}
    </div>
  );
}

