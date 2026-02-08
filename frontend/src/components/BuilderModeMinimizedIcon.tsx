import { Maximize2 } from 'lucide-react';
import ConstructionIcon from '@mui/icons-material/Construction';

interface BuilderModeMinimizedIconProps {
  actionCount: number;
  onMaximize: () => void;
  isMinimized: boolean;
  showPulse?: boolean;
  zIndex?: string;
}

export default function BuilderModeMinimizedIcon({
  actionCount,
  onMaximize,
  isMinimized,
  showPulse = false,
  zIndex = 'z-40',
}: BuilderModeMinimizedIconProps) {
  // If minimized, show blue maximize icon with action count
  // Otherwise, show purple builder icon to open builder mode
  const bgColor = isMinimized 
    ? 'bg-blue-600 hover:bg-blue-700' 
    : 'bg-purple-600 hover:bg-purple-700';
  
  const title = isMinimized
    ? `Builder Mode - ${actionCount} action${actionCount !== 1 ? 's' : ''} recorded`
    : 'Open Builder Mode';

  return (
    <button
      onClick={onMaximize}
      className={`fixed bottom-24 right-6 w-14 h-14 ${bgColor} text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${zIndex} ${showPulse ? 'animate-pulse' : ''}`}
      title={title}
    >
      <div className="relative">
        {isMinimized ? (
          <Maximize2 size={24} />
        ) : (
          <ConstructionIcon sx={{ fontSize: '28px', color: '#ffffff' }} />
        )}
        {isMinimized && actionCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {actionCount > 9 ? '9+' : actionCount}
          </span>
        )}
      </div>
    </button>
  );
}
