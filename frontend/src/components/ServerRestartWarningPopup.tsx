import { useEffect } from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

interface ServerRestartWarningPopupProps {
  onProceed: () => void;
  onCancel: () => void;
}

export default function ServerRestartWarningPopup({ onProceed, onCancel }: ServerRestartWarningPopupProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter or Cmd+Enter to proceed
        onProceed();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onProceed, onCancel]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      // Don't close on backdrop click - user must explicitly choose
    }
  };

  const handleProceed = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onProceed();
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onCancel();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 border border-yellow-500 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Server Restart Detected</h2>
          </div>
          <button
            onClick={(e) => handleCancel(e)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-300">
            The server has restarted or reconnected. The page needs to be refreshed to ensure all features work correctly.
          </div>

          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded p-3">
            <div className="text-sm font-medium text-yellow-400 mb-1">
              What happens next?
            </div>
            <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
              <li>Your current work will be saved automatically</li>
              <li>The page will reload to sync with the server</li>
              <li>You may lose unsaved form inputs</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={(e) => handleCancel(e)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={(e) => handleProceed(e)}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
