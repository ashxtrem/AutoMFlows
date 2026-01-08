import { X, AlertCircle, FileText } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';

interface NodeErrorPopupProps {
  nodeId: string;
  error: {
    message: string;
    traceLogs: string[];
  };
  onClose: () => void;
}

export default function NodeErrorPopup({ nodeId, error, onClose }: NodeErrorPopupProps) {
  const { nodes } = useWorkflowStore();

  const node = nodes.find(n => n.id === nodeId);
  const nodeLabel = node?.data?.label || node?.data?.type || nodeId;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent event from bubbling to backdrop
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 border border-red-500 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Node Execution Error</h2>
          </div>
          <button
            onClick={(e) => handleCloseClick(e)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1 space-y-4">
          {/* Node Info */}
          <div className="bg-gray-700 rounded p-3 border border-gray-600">
            <div className="text-sm font-medium text-white mb-2">
              Failed Node: <span className="text-red-400">{nodeLabel}</span>
            </div>
            <div className="text-xs text-gray-400">
              Node ID: <span className="font-mono">{nodeId}</span>
            </div>
          </div>

          {/* Error Message */}
          <div className="bg-red-900/30 border border-red-500/50 rounded p-3">
            <div className="text-sm font-medium text-red-400 mb-1">Error Message</div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap">{error.message}</div>
          </div>

          {/* Trace Logs */}
          {error.traceLogs && error.traceLogs.length > 0 && (
            <div className="bg-gray-700 rounded p-3 border border-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-gray-400" size={16} />
                <div className="text-sm font-medium text-white">
                  Trace Logs ({error.traceLogs.length} entries)
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3 max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                  {error.traceLogs.join('\n')}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={(e) => handleCloseClick(e)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

