import { useEffect } from 'react';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';

interface LoadWarningProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LoadWarning({ onConfirm, onCancel }: LoadWarningProps) {
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
            <h2 className="text-lg font-semibold text-white">Load Workflow</h2>
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
            You have an existing workflow loaded. Loading a new workflow will replace the current one. This action cannot be undone.
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
            Load Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
