import { X } from 'lucide-react';

interface SecurityWarningProps {
  onDismiss: () => void;
}

export default function SecurityWarning({ onDismiss }: SecurityWarningProps) {
  return (
    <div className="bg-yellow-900 border-b border-yellow-700 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-yellow-400 font-semibold">⚠️ Security Warning:</span>
        <span className="text-yellow-200 text-sm">
          This tool is intended for local/private network use only. JavaScript Code nodes execute arbitrary code on the server.
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="text-yellow-400 hover:text-yellow-300 p-1"
        aria-label="Dismiss warning"
      >
        <X size={18} />
      </button>
    </div>
  );
}

