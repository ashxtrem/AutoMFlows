import { useState, useEffect, useMemo } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ErrorIcon from '@mui/icons-material/Error';
import { useWorkflowStore } from '../store/workflowStore';
import { useExecution } from '../hooks/useExecution';

const BUTTON_SIZE = 48; // Size of the circular button
const BUTTON_GAP = 12; // Gap between buttons
const TOP_MARGIN = 20; // Distance from top of viewport

export default function FloatingRunButton() {
  const { executionStatus, resetExecution, failedNodes, navigateToFailedNode } = useWorkflowStore();
  const { executeWorkflow, stopExecution } = useExecution();
  
  // Load trace logs from localStorage (same as TopBar)
  const traceLogs = typeof window !== 'undefined' 
    ? localStorage.getItem('automflows_trace_logs') === 'true'
    : false;

  // Calculate total width based on number of buttons
  const hasFailedNodes = failedNodes.size > 0;
  const buttonCount = 1 + (hasFailedNodes ? 1 : 0);
  const totalWidth = BUTTON_SIZE * buttonCount + BUTTON_GAP * (buttonCount - 1);

  // Calculate position: top middle (centered horizontally, fixed distance from top)
  const [viewportWidth, setViewportWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const position = useMemo(() => {
    const x = (viewportWidth - totalWidth) / 2;
    return { x: Math.max(0, x), y: TOP_MARGIN };
  }, [viewportWidth, totalWidth]);

  const handleRun = async () => {
    resetExecution();
    await executeWorkflow(traceLogs);
  };

  const handleStop = () => {
    stopExecution();
    resetExecution();
  };

  const handleRunClick = () => {
    if (executionStatus === 'running') {
      handleStop();
    } else {
      handleRun();
    }
  };

  const isRunning = executionStatus === 'running';

  return (
    <div
      className="fixed z-30 flex items-center gap-3"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        pointerEvents: 'auto',
      }}
    >
      {/* Run/Stop Button */}
      <button
        onClick={handleRunClick}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center relative flex-shrink-0
          bg-white/10 dark:bg-gray-800/20 backdrop-blur-md
          border border-white/20 dark:border-gray-700/50
          shadow-lg
          transition-all duration-200
          hover:bg-white/20 dark:hover:bg-gray-800/30
          ${isRunning ? 'hover:bg-red-500/20 dark:hover:bg-red-500/30' : 'hover:bg-green-500/20 dark:hover:bg-green-500/30'}
          hover:scale-110
          select-none
          cursor-pointer
        `}
        style={{ 
          pointerEvents: 'auto',
          boxShadow: isRunning 
            ? '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)'
            : '0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)'
        }}
        title={isRunning ? 'Stop execution' : 'Run workflow'}
      >
        {/* Colored blur backdrop */}
        <div 
          className={`absolute inset-0 rounded-full blur-xl opacity-60 ${
            isRunning ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ zIndex: -1 }}
        />
        {isRunning ? (
          <StopIcon sx={{ fontSize: '24px', color: '#ffffff', pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' }} />
        ) : (
          <PlayArrowIcon sx={{ fontSize: '24px', color: '#ffffff', pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' }} />
        )}
      </button>

      {/* Go to Failed Node Button */}
      {hasFailedNodes && (
        <button
          onClick={() => navigateToFailedNode?.()}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center relative flex-shrink-0
            bg-white/10 dark:bg-gray-800/20 backdrop-blur-md
            border border-white/20 dark:border-gray-700/50
            shadow-lg
            transition-all duration-200
            hover:bg-white/20 dark:hover:bg-gray-800/30
            hover:bg-red-500/20 dark:hover:bg-red-500/30
            hover:scale-110
            select-none
            cursor-pointer
          `}
          style={{ 
            pointerEvents: 'auto',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)'
          }}
          title={`Go to failed node (${failedNodes.size} failed) - Ctrl/Cmd+Shift+F`}
        >
          {/* Red blur backdrop */}
          <div 
            className="absolute inset-0 rounded-full blur-xl opacity-60 bg-red-500"
            style={{ zIndex: -1 }}
          />
          <ErrorIcon sx={{ fontSize: '24px', color: '#ffffff', pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' }} />
        </button>
      )}
    </div>
  );
}
