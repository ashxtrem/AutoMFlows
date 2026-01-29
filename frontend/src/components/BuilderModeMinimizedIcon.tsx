import { Maximize2 } from 'lucide-react';

interface BuilderModeMinimizedIconProps {
  actionCount: number;
  onMaximize: () => void;
}

export default function BuilderModeMinimizedIcon({
  actionCount,
  onMaximize,
}: BuilderModeMinimizedIconProps) {
  return (
    <button
      onClick={onMaximize}
      className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-40"
      title={`Builder Mode - ${actionCount} action${actionCount !== 1 ? 's' : ''} recorded`}
    >
      <div className="relative">
        <Maximize2 size={24} />
        {actionCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {actionCount > 9 ? '9+' : actionCount}
          </span>
        )}
      </div>
    </button>
  );
}
