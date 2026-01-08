import { X, AlertTriangle } from 'lucide-react';

interface ResetWarningProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ResetWarning({ onConfirm, onCancel }: ResetWarningProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={20} />
            <h2 className="text-lg font-semibold text-white">Reset Canvas</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-gray-300 mb-4">
            Are you sure you want to reset the canvas? This will remove all nodes and edges. This action cannot be undone.
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
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Reset Canvas
          </button>
        </div>
      </div>
    </div>
  );
}

