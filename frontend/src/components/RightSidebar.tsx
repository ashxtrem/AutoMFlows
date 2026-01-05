import { X } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import NodeConfigForm from './NodeConfigForm';

export default function RightSidebar() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);

  if (!selectedNode) {
    return null;
  }

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Node Properties</h2>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <NodeConfigForm node={selectedNode} />
      </div>
    </div>
  );
}

