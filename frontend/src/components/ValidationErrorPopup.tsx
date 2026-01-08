import { X, AlertCircle } from 'lucide-react';
import { ValidationError } from '../utils/validation';
import { useWorkflowStore } from '../store/workflowStore';

interface ValidationErrorPopupProps {
  errors: ValidationError[];
  onClose: () => void;
}

export default function ValidationErrorPopup({ errors, onClose }: ValidationErrorPopupProps) {
  const { nodes, setSelectedNode } = useWorkflowStore();

  const handleFocusNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      // TODO: Scroll to node or zoom to it
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Validation Errors</h2>
            <span className="text-sm text-gray-400">({errors.length} error{errors.length !== 1 ? 's' : ''})</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          <div className="space-y-3">
            {errors.map((error, index) => (
              <div
                key={index}
                className="bg-gray-700 rounded p-3 border border-gray-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white mb-1">
                      {error.nodeName}
                    </div>
                    <div className="text-sm text-gray-300">
                      Property: <span className="font-medium">{error.propertyLabel}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {error.message}
                    </div>
                  </div>
                  <button
                    onClick={() => handleFocusNode(error.nodeId)}
                    className="ml-4 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Focus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

