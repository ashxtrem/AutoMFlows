import { useState, useEffect, useRef } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWorkflowStore } from '../store/workflowStore';
import { useExecution } from '../hooks/useExecution';
import { serializeWorkflow, deserializeWorkflow } from '../utils/serialization';
import ValidationErrorPopup from './ValidationErrorPopup';
import ResetWarning from './ResetWarning';
import LoadWarning from './LoadWarning';
import { NodeType } from '@automflows/shared';

const STORAGE_KEY_TRACE_LOGS = 'automflows_trace_logs';

export default function TopBar() {
  const { nodes, edges, setNodes, setEdges, executionStatus, resetExecution } = useWorkflowStore();
  const { executeWorkflow, stopExecution, validationErrors, setValidationErrors } = useExecution();
  
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showLoadWarning, setShowLoadWarning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [pendingLoadAction, setPendingLoadAction] = useState<(() => void) | null>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  
  // Load trace logs state from localStorage on mount
  const [traceLogs, setTraceLogs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TRACE_LOGS);
    return saved === 'true';
  });

  // Save trace logs state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TRACE_LOGS, String(traceLogs));
  }, [traceLogs]);

  // Auto-hide functionality
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      // Show menu when cursor is near top of screen (within 50px)
      if (e.clientY <= 50) {
        setIsVisible(true);
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // Check if mouse is leaving the top bar area
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (!relatedTarget || (topBarRef.current && !topBarRef.current.contains(relatedTarget))) {
        // Delay hiding to allow smooth transition
        hideTimeout = setTimeout(() => {
          setIsVisible(false);
        }, 300);
      }
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    const topBarElement = topBarRef.current;
    if (topBarElement) {
      topBarElement.addEventListener('mouseenter', handleMouseEnter);
      topBarElement.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (topBarElement) {
        topBarElement.removeEventListener('mouseenter', handleMouseEnter);
        topBarElement.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, []);

  const handleRun = async () => {
    resetExecution();
    await executeWorkflow(traceLogs);
  };

  const handleStop = () => {
    stopExecution();
    resetExecution();
  };

  const handleSave = () => {
    const workflow = serializeWorkflow(nodes, edges);
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const performLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const workflow = JSON.parse(event.target?.result as string);
            const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(workflow);
            setNodes(loadedNodes);
            setEdges(loadedEdges);
          } catch (error) {
            alert('Failed to load workflow: ' + (error as Error).message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setShowLoadWarning(false);
    setPendingLoadAction(null);
  };

  const handleLoad = () => {
    const hasWorkflow = nodes.length > 0;
    if (hasWorkflow) {
      setPendingLoadAction(() => performLoad);
      setShowLoadWarning(true);
    } else {
      performLoad();
    }
  };

  const loadSampleTemplate = () => {
    // Clear existing workflow
    setNodes([]);
    setEdges([]);
    resetExecution();

    // Create nodes with proper spacing (200px horizontal spacing)
    const startX = 100;
    const y = 200;
    const spacing = 250;

    // Start node
    const startId = `${NodeType.START}-${Date.now()}`;
    const startNode = {
      id: startId,
      type: 'custom' as const,
      position: { x: startX, y },
      data: {
        type: NodeType.START,
        label: 'Start',
      },
    };

    // Open Browser node
    const openBrowserId = `${NodeType.OPEN_BROWSER}-${Date.now()}`;
    const openBrowserNode = {
      id: openBrowserId,
      type: 'custom' as const,
      position: { x: startX + spacing, y },
      data: {
        type: NodeType.OPEN_BROWSER,
        label: 'Open Browser',
        headless: false,
        viewportWidth: 1280,
        viewportHeight: 720,
      },
    };

    // Navigate node
    const navigateId = `${NodeType.NAVIGATE}-${Date.now()}`;
    const navigateNode = {
      id: navigateId,
      type: 'custom' as const,
      position: { x: startX + spacing * 2, y },
      data: {
        type: NodeType.NAVIGATE,
        label: 'Navigate',
        url: 'https://example.com',
        timeout: 30000,
        waitUntil: 'networkidle',
      },
    };

    // Wait node
    const waitId = `${NodeType.WAIT}-${Date.now()}`;
    const waitNode = {
      id: waitId,
      type: 'custom' as const,
      position: { x: startX + spacing * 3, y },
      data: {
        type: NodeType.WAIT,
        label: 'Wait',
        waitType: 'timeout',
        value: 2000,
      },
    };

    // Screenshot node
    const screenshotId = `${NodeType.SCREENSHOT}-${Date.now()}`;
    const screenshotNode = {
      id: screenshotId,
      type: 'custom' as const,
      position: { x: startX + spacing * 4, y },
      data: {
        type: NodeType.SCREENSHOT,
        label: 'Screenshot',
        fullPage: false,
      },
    };

    // Set all nodes
    setNodes([startNode, openBrowserNode, navigateNode, waitNode, screenshotNode]);

    // Create edges
    const newEdges = [
      {
        id: `edge-${startId}-output-${openBrowserId}-input`,
        source: startId,
        target: openBrowserId,
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: `edge-${startId}-output-${openBrowserId}-driver`,
        source: startId,
        target: openBrowserId,
        sourceHandle: 'output',
        targetHandle: 'driver',
      },
      {
        id: `edge-${openBrowserId}-output-${navigateId}-input`,
        source: openBrowserId,
        target: navigateId,
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: `edge-${openBrowserId}-output-${navigateId}-driver`,
        source: openBrowserId,
        target: navigateId,
        sourceHandle: 'output',
        targetHandle: 'driver',
      },
      {
        id: `edge-${navigateId}-output-${waitId}-input`,
        source: navigateId,
        target: waitId,
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: `edge-${navigateId}-output-${waitId}-driver`,
        source: navigateId,
        target: waitId,
        sourceHandle: 'output',
        targetHandle: 'driver',
      },
      {
        id: `edge-${waitId}-output-${screenshotId}-input`,
        source: waitId,
        target: screenshotId,
        sourceHandle: 'output',
        targetHandle: 'input',
      },
      {
        id: `edge-${waitId}-output-${screenshotId}-driver`,
        source: waitId,
        target: screenshotId,
        sourceHandle: 'output',
        targetHandle: 'driver',
      },
    ];

    setEdges(newEdges);
  };

  const handleReset = () => {
    const hasWorkflow = nodes.length > 0;
    if (hasWorkflow) {
      setShowResetWarning(true);
    } else {
      loadSampleTemplate();
    }
  };

  const confirmReset = () => {
    loadSampleTemplate();
    setShowResetWarning(false);
  };

  const confirmLoad = () => {
    if (pendingLoadAction) {
      pendingLoadAction();
    }
  };

  return (
    <>
      <div
        ref={topBarRef}
        className={`fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between z-40 transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">AutoMFlows</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={executionStatus === 'running'}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2 text-sm font-medium"
          >
            <PlayArrowIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
            Run
          </button>
          <button
            onClick={handleStop}
            disabled={executionStatus !== 'running'}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2 text-sm font-medium"
          >
            <StopIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
            Stop
          </button>
          <div className="w-px h-6 bg-gray-700 mx-2" />
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
          >
            <SaveIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
            Save
          </button>
          <button
            onClick={handleLoad}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
          >
            <UploadFileIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
            Load
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
          >
            <RefreshIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
            Reset
          </button>
          <div className="w-px h-6 bg-gray-700 mx-2" />
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-white">
            <div className="relative">
              <input
                type="checkbox"
                checked={traceLogs}
                onChange={(e) => setTraceLogs(e.target.checked)}
                className="sr-only"
              />
              <div className={`block h-8 w-14 rounded-full transition-colors ${traceLogs ? 'bg-green-600' : 'bg-gray-600'}`}></div>
              <div className={`dot absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform ${traceLogs ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
            <span>Trace Logs</span>
          </label>
        </div>
      </div>
      {validationErrors.length > 0 && (
        <ValidationErrorPopup
          errors={validationErrors}
          onClose={() => setValidationErrors([])}
        />
      )}
      {showResetWarning && (
        <ResetWarning
          onConfirm={confirmReset}
          onCancel={() => setShowResetWarning(false)}
        />
      )}
      {showLoadWarning && (
        <LoadWarning
          onConfirm={confirmLoad}
          onCancel={() => {
            setShowLoadWarning(false);
            setPendingLoadAction(null);
          }}
        />
      )}
    </>
  );
}
