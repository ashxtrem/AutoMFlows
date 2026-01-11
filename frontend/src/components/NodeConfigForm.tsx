import { Node } from 'reactflow';
import { NodeType } from '@automflows/shared';
import { useWorkflowStore } from '../store/workflowStore';
import OpenBrowserConfig from './nodeConfigs/OpenBrowserConfig';
import NavigateConfig from './nodeConfigs/NavigateConfig';
import ClickConfig from './nodeConfigs/ClickConfig';
import TypeConfig from './nodeConfigs/TypeConfig';
import GetTextConfig from './nodeConfigs/GetTextConfig';
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
import ReusableNodeConfig, { ReusableConfig, RunReusableConfig } from '@plugins/reusable-node/config';

interface NodeConfigFormProps {
  node: Node;
}

export default function NodeConfigForm({ node }: NodeConfigFormProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const nodeType = node.data.type as NodeType | string;

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
        case NodeType.NAVIGATE:
          return <NavigateConfig node={node} onChange={handleChange} />;
        case NodeType.CLICK:
          return <ClickConfig node={node} onChange={handleChange} />;
        case NodeType.TYPE:
          return <TypeConfig node={node} onChange={handleChange} />;
        case NodeType.GET_TEXT:
          return <GetTextConfig node={node} onChange={handleChange} />;
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

  return <div className="space-y-4">{renderConfig()}</div>;
}

