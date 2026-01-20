import { useState, useEffect } from 'react';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';

interface BreakpointHeadlessWarningProps {
  onContinue: () => void;
  onDisableAndRun: () => void;
  onCancel: () => void;
  onDontAskAgain: (choice: 'continue' | 'disable') => void;
}

export default function BreakpointHeadlessWarning({
  onContinue,
  onDisableAndRun,
  onCancel,
  onDontAskAgain,
}: BreakpointHeadlessWarningProps) {
  const [dontAskAgain, setDontAskAgain] = useState(true);

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

  const handleContinue = () => {
    if (dontAskAgain) {
      onDontAskAgain('continue');
    }
    onContinue();
  };

  const handleDisableAndRun = () => {
    if (dontAskAgain) {
      onDontAskAgain('disable');
    }
    onDisableAndRun();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <WarningIcon sx={{ fontSize: '20px', color: '#fbbf24' }} />
            <h2 className="text-lg font-semibold text-white">Breakpoint Warning</h2>
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
            Breakpoints are enabled but the browser is running in headless mode. Breakpoints are not very useful in headless mode since you cannot interact with the browser window.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="dontAskAgain"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="dontAskAgain" className="text-sm text-gray-300 cursor-pointer">
              Don't ask again for this workflow
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDisableAndRun}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Disable Breakpoints & Run
          </button>
          <button
            onClick={handleContinue}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
