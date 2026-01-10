import { useEffect } from 'react';
import { X, AlertCircle, Terminal } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';

interface BrowserInstallErrorPopupProps {
  nodeId: string;
  browserName: string;
  onClose: () => void;
}

export default function BrowserInstallErrorPopup({ nodeId, browserName, onClose }: BrowserInstallErrorPopupProps) {
  const { nodes } = useWorkflowStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const node = nodes.find(n => n.id === nodeId);
  const nodeLabel = node?.data?.label || node?.data?.type || nodeId;
  const browserType = browserName.toLowerCase();

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onClose();
  };

  const installationCommand = `npx playwright install ${browserType}`;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 border border-red-500 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Browser Not Installed</h2>
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
            <div className="text-sm font-medium text-red-400 mb-2">
              {browserName} is not installed
            </div>
            <div className="text-sm text-gray-300">
              The selected browser ({browserName}) is not installed on your system. Please install it to continue.
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="bg-gray-700 rounded p-3 border border-gray-600">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="text-gray-400" size={16} />
              <div className="text-sm font-medium text-white">
                Installation Command
              </div>
            </div>
            <div className="bg-gray-900 rounded p-3">
              <code className="text-sm text-green-400 font-mono">
                {installationCommand}
              </code>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Run this command in your terminal to install {browserName}. After installation, try running your workflow again.
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-900/30 border border-blue-500/50 rounded p-3">
            <div className="text-sm font-medium text-blue-400 mb-1">
              Need Help?
            </div>
            <div className="text-xs text-gray-300">
              For more information about installing Playwright browsers, visit:{' '}
              <a 
                href="https://playwright.dev/docs/browsers#installing-browsers" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Playwright Browser Installation Guide
              </a>
            </div>
          </div>
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

