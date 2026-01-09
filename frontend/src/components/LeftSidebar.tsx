import { useWorkflowStore } from '../store/workflowStore';
import { NodeType } from '@automflows/shared';
import { useMemo } from 'react';
import { frontendPluginRegistry } from '../plugins/registry';

const NODE_CATEGORIES = [
  {
    label: 'Start',
    nodes: [
      { type: NodeType.START, label: 'Start', icon: '🚀' },
    ],
  },
  {
    label: 'Browser',
    nodes: [
      { type: NodeType.OPEN_BROWSER, label: 'Open Browser', icon: '🌐' },
      { type: NodeType.NAVIGATE, label: 'Navigate', icon: '🔗' },
    ],
  },
  {
    label: 'Interaction',
    nodes: [
      { type: NodeType.CLICK, label: 'Click', icon: '👆' },
      { type: NodeType.TYPE, label: 'Type', icon: '⌨️' },
    ],
  },
  {
    label: 'Data',
    nodes: [
      { type: NodeType.GET_TEXT, label: 'Get Text', icon: '📝' },
      { type: NodeType.SCREENSHOT, label: 'Screenshot', icon: '📸' },
    ],
  },
  {
    label: 'Control',
    nodes: [
      { type: NodeType.WAIT, label: 'Wait', icon: '⏱️' },
      { type: NodeType.LOOP, label: 'Loop', icon: '🔁' },
    ],
  },
  {
    label: 'Code',
    nodes: [
      { type: NodeType.JAVASCRIPT_CODE, label: 'JavaScript Code', icon: '💻' },
    ],
  },
  {
    label: 'Values',
    nodes: [
      { type: NodeType.INT_VALUE, label: 'Int Value', icon: '🔢' },
      { type: NodeType.STRING_VALUE, label: 'String Value', icon: '📄' },
      { type: NodeType.BOOLEAN_VALUE, label: 'Boolean Value', icon: '✓' },
      { type: NodeType.INPUT_VALUE, label: 'Input Value', icon: '📥' },
    ],
  },
];

export default function LeftSidebar() {
  const addNode = useWorkflowStore((state) => state.addNode);

  // Get plugin nodes and group by category
  const pluginCategories = useMemo(() => {
    const pluginNodes = frontendPluginRegistry.getAllNodeDefinitions();
    const categoryMap = new Map<string, Array<{ type: string; label: string; icon: string }>>();

    pluginNodes.forEach((nodeDef) => {
      const category = nodeDef.category || 'Plugins';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push({
        type: nodeDef.type,
        label: nodeDef.label,
        icon: nodeDef.icon || '📦',
      });
    });

    return Array.from(categoryMap.entries()).map(([label, nodes]) => ({
      label,
      nodes,
    }));
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: NodeType | string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Node Library</h2>
        <div className="space-y-6">
          {NODE_CATEGORIES.map((category) => (
            <div key={category.label}>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">{category.label}</h3>
              <div className="space-y-1">
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node.type)}
                    onClick={() => addNode(node.type, { x: 250, y: 250 })}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-move flex items-center gap-2 text-sm text-gray-200 transition-colors"
                  >
                    <span>{node.icon}</span>
                    <span>{node.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {pluginCategories.length > 0 && pluginCategories.map((category) => (
            <div key={category.label}>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">{category.label}</h3>
              <div className="space-y-1">
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node.type)}
                    onClick={() => addNode(node.type, { x: 250, y: 250 })}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-move flex items-center gap-2 text-sm text-gray-200 transition-colors"
                  >
                    <span>{node.icon}</span>
                    <span>{node.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

