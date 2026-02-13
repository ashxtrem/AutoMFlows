import { useEffect } from 'react';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';

interface BuilderModeWarningProps {
  actionCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function BuilderModeWarning({ actionCount, onConfirm, onCancel }: BuilderModeWarningProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <WarningIcon sx={{ fontSize: '20px', color: '#fbbf24' }} />
            <h2 className="text-lg font-semibold text-white">Builder Mode Active</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <CloseIcon sx={{ fontSize: '20px' }} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-gray-300 mb-4">
            You have {actionCount} recorded action{actionCount !== 1 ? 's' : ''} in Builder Mode. Starting a new workflow execution will clear all recorded actions and reset Builder Mode.
          </p>
          <p className="text-gray-400 text-sm">
            If a breakpoint pause occurs during execution, Builder Mode will be available again.
          </p>
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Clear and Run
          </button>
        </div>
      </div>
    </div>
  );
}
