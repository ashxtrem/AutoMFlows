import { useState, useEffect, useMemo } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import ErrorIcon from '@mui/icons-material/Error';
import { SkipForward } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { useExecution } from '../hooks/useExecution';
import BreakpointHeadlessWarning from './BreakpointHeadlessWarning';

const BUTTON_SIZE = 48; // Size of the circular button
const BUTTON_GAP = 12; // Gap between buttons
const TOP_MARGIN = 20; // Distance from top of viewport

export default function FloatingRunButton() {
  const { 
    executionStatus, 
    resetExecution, 
    failedNodes, 
    navigateToFailedNode,
    pausedNodeId,
    pauseReason,
    pauseBreakpointAt,
    navigateToPausedNode,
  } = useWorkflowStore();
  const { 
    executeWorkflow, 
    stopExecution, 
    continueExecution, 
    pauseControl,
    showBreakpointWarning,
    handleBreakpointWarningContinue,
    handleBreakpointWarningDisable,
    handleBreakpointWarningCancel,
    handleBreakpointWarningDontAskAgain,
  } = useExecution();
  
  // Load trace logs from localStorage (same as TopBar)
  const traceLogs = typeof window !== 'undefined' 
    ? localStorage.getItem('automflows_trace_logs') === 'true'
    : false;

  const isPaused = pausedNodeId !== null;
  const hasFailedNodes = failedNodes.size > 0 && !isPaused;
  
  // Calculate total width based on number of buttons
  // When paused, show pause icon + 2 control buttons + navigation button
  const buttonCount = isPaused 
    ? 1 + 2 + 1 // pause icon + stop/continue + navigation
    : 1 + (hasFailedNodes ? 1 : 0); // run/stop + failed node button
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
    // Don't allow clicking when paused - pause icon should be unclickable
    if (isPaused) {
      return;
    }
    if (executionStatus === 'running') {
      handleStop();
    } else {
      handleRun();
    }
  };

  const handleContinue = async () => {
    if (pauseReason === 'breakpoint') {
      await pauseControl('continue');
    } else {
      await continueExecution();
    }
  };

  const handleStopFromPause = async () => {
    if (pauseReason === 'breakpoint') {
      await pauseControl('stop');
      resetExecution();
    } else {
      await stopExecution();
      resetExecution();
    }
  };

  const handleSkip = async () => {
    await pauseControl('skip');
  };

  const handleContinueWithoutBreakpoint = async () => {
    await pauseControl('continueWithoutBreakpoint');
  };

  const isRunning = executionStatus === 'running';
  const pauseButtonText = pauseReason === 'breakpoint' ? 'Go to Breakpoint Node' : 'Go to Pause Node';
  const isBreakpointPause = pauseReason === 'breakpoint';

  return (
    <div
      data-tour="run-button"
      className="fixed z-30 flex flex-col items-center gap-3"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        pointerEvents: 'auto',
      }}
    >
      {/* Run/Stop/Pause Button */}
      <button
        onClick={handleRunClick}
        disabled={isPaused}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center relative flex-shrink-0
          bg-white/10 dark:bg-gray-800/20 backdrop-blur-md
          border border-white/20 dark:border-gray-700/50
          shadow-lg
          transition-all duration-200
          ${isPaused 
            ? 'cursor-not-allowed opacity-75' 
            : (isRunning 
              ? 'hover:bg-red-500/20 dark:hover:bg-red-500/30 hover:scale-110 cursor-pointer' 
              : 'hover:bg-green-500/20 dark:hover:bg-green-500/30 hover:scale-110 cursor-pointer')
          }
          select-none
        `}
        style={{ 
          pointerEvents: isPaused ? 'none' : 'auto',
          boxShadow: isPaused
            ? '0 0 20px rgba(234, 179, 8, 0.6), 0 0 40px rgba(234, 179, 8, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)'
            : (isRunning 
              ? '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)'
              : '0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)')
        }}
        title={isPaused ? 'Execution paused - use controls below' : (isRunning ? 'Stop execution' : 'Run workflow')}
      >
        {/* Colored blur backdrop */}
        <div 
          className={`absolute inset-0 rounded-full blur-xl opacity-60 ${
            isPaused ? 'bg-yellow-500' : (isRunning ? 'bg-red-500' : 'bg-green-500')
          }`}
          style={{ zIndex: -1 }}
        />
        {isPaused ? (
          <PauseIcon sx={{ fontSize: '24px', color: '#ffffff', pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' }} />
        ) : isRunning ? (
          <StopIcon sx={{ fontSize: '24px', color: '#ffffff', pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' }} />
        ) : (
          <PlayArrowIcon sx={{ fontSize: '24px', color: '#ffffff', pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' }} />
        )}
      </button>

      {/* Pause Controls - Show when paused */}
      {isPaused && (
        <>
          <div className={`flex gap-2 ${isBreakpointPause ? 'flex-wrap justify-center' : ''}`}>
            <button
              onClick={handleContinue}
              className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shadow-lg transition-all hover:scale-110"
              title="Continue execution"
            >
              <PlayArrowIcon sx={{ fontSize: '20px', color: '#ffffff' }} />
            </button>
            <button
              onClick={handleStopFromPause}
              className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-all hover:scale-110"
              title="Stop execution"
            >
              <StopIcon sx={{ fontSize: '20px', color: '#ffffff' }} />
            </button>
            {/* Breakpoint-specific controls */}
            {isBreakpointPause && (
              <>
                {/* Skip button - only show for pre breakpoint */}
                {pauseBreakpointAt === 'pre' && (
                  <button
                    onClick={handleSkip}
                    className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                    title="Skip node"
                  >
                    <SkipForward size={20} color="#ffffff" />
                  </button>
                )}
                <button
                  onClick={handleContinueWithoutBreakpoint}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                  title="Continue without breakpoint"
                >
                  <PlayArrowIcon sx={{ fontSize: '20px', color: '#ffffff' }} />
                </button>
              </>
            )}
          </div>
          {/* Go to Paused Node Button */}
          <button
            onClick={() => navigateToPausedNode?.()}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center relative flex-shrink-0
              bg-white/10 dark:bg-gray-800/20 backdrop-blur-md
              border border-white/20 dark:border-gray-700/50
              shadow-lg
              transition-all duration-200
              hover:bg-white/20 dark:hover:bg-gray-800/30
              hover:bg-yellow-500/20 dark:hover:bg-yellow-500/30
              hover:scale-110
              select-none
              cursor-pointer
            `}
            style={{ 
              pointerEvents: 'auto',
              boxShadow: '0 0 20px rgba(234, 179, 8, 0.6), 0 0 40px rgba(234, 179, 8, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)'
            }}
            title={pauseButtonText}
          >
            {/* Yellow blur backdrop */}
            <div 
              className="absolute inset-0 rounded-full blur-xl opacity-60 bg-yellow-500"
              style={{ zIndex: -1 }}
            />
            <ErrorIcon sx={{ fontSize: '24px', color: '#ffffff', pointerEvents: 'none', filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' }} />
          </button>
        </>
      )}

      {/* Go to Failed Node Button - Show when not paused */}
      {hasFailedNodes && !isPaused && (
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

      {/* Breakpoint Headless Warning Dialog */}
      {showBreakpointWarning && (
        <BreakpointHeadlessWarning
          onContinue={handleBreakpointWarningContinue}
          onDisableAndRun={handleBreakpointWarningDisable}
          onCancel={handleBreakpointWarningCancel}
          onDontAskAgain={handleBreakpointWarningDontAskAgain}
        />
      )}
    </div>
  );
}
