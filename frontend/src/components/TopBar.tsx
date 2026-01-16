import { useState, useEffect, useRef } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import ErrorIcon from '@mui/icons-material/Error';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useWorkflowStore, getDefaultNodeData } from '../store/workflowStore';
import { useExecution } from '../hooks/useExecution';
import { serializeWorkflow, deserializeWorkflow } from '../utils/serialization';
import ValidationErrorPopup from './ValidationErrorPopup';
import ResetWarning from './ResetWarning';
import LoadWarning from './LoadWarning';
import SettingsDropdown from './SettingsDropdown';
import ReportSettingsPopup from './ReportSettingsPopup';
import NotificationContainer from './NotificationContainer';
import { NodeType } from '@automflows/shared';
import { useNotificationStore } from '../store/notificationStore';

const STORAGE_KEY_TRACE_LOGS = 'automflows_trace_logs';
const STORAGE_KEY_MENU_FIXED = 'automflows_menu_fixed';

export default function TopBar() {
  const { nodes, edges, setNodes, setEdges, executionStatus, resetExecution, failedNodes, navigateToFailedNode, edgesHidden, setEdgesHidden } = useWorkflowStore();
  const { executeWorkflow, stopExecution, validationErrors, setValidationErrors } = useExecution();
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showLoadWarning, setShowLoadWarning] = useState(false);
  const [showReportSettings, setShowReportSettings] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [pendingLoadAction, setPendingLoadAction] = useState<(() => void) | null>(null);
  const [currentFileHandle, setCurrentFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);
  const saveDropdownRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  
  // Check for File System Access API support
  const supportsFileSystemAccess = typeof window !== 'undefined' && 
    'showOpenFilePicker' in window && 
    'showSaveFilePicker' in window;
  
  // Load trace logs state from localStorage on mount
  const [traceLogs, setTraceLogs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TRACE_LOGS);
    return saved === 'true';
  });

  // Load menu fixed state from localStorage on mount
  const [menuFixed, setMenuFixed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MENU_FIXED);
    return saved === 'true';
  });

  // Save trace logs state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TRACE_LOGS, String(traceLogs));
  }, [traceLogs]);

  // Save menu fixed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MENU_FIXED, String(menuFixed));
    // If menu is set to fixed, ensure it's visible
    if (menuFixed) {
      setIsVisible(true);
    }
  }, [menuFixed]);

  // Auto-hide functionality (only enabled when menuFixed is false)
  useEffect(() => {
    // If menu is fixed, don't set up auto-hide
    if (menuFixed) {
      setIsVisible(true);
      return;
    }

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
  }, [menuFixed]);

  const handleRun = async () => {
    resetExecution();
    await executeWorkflow(traceLogs);
  };

  const handleStop = () => {
    stopExecution();
    resetExecution();
  };

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(target)) {
        setSaveDropdownOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && saveDropdownOpen) {
        setSaveDropdownOpen(false);
      }
    };

    if (saveDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [saveDropdownOpen]);

  const downloadWorkflow = (filename: string) => {
    const workflow = serializeWorkflow(nodes, edges);
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setSaveDropdownOpen(false);
    
    try {
      const workflow = serializeWorkflow(nodes, edges);
      const workflowJson = JSON.stringify(workflow, null, 2);

      if (supportsFileSystemAccess && currentFileHandle) {
        // Write directly to the file handle
        try {
          const writable = await currentFileHandle.createWritable();
          await writable.write(workflowJson);
          await writable.close();
          
          addNotification({
            type: 'info',
            title: 'Workflow Saved',
            message: `Saved to ${currentFileHandle.name}`,
          });
        } catch (error) {
          // If writing fails (e.g., permission denied), fall back to Save As
          console.warn('Failed to write to file handle:', error);
          await handleSaveAs();
        }
      } else {
        // Fallback: use Save As behavior
        if (currentFileHandle) {
          // Try to use the filename from the handle
          downloadWorkflow(currentFileHandle.name);
          addNotification({
            type: 'info',
            title: 'Workflow Saved',
            message: `Saved as ${currentFileHandle.name}`,
          });
        } else {
          // No file handle, use Save As
          await handleSaveAs();
        }
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save workflow: ' + (error as Error).message,
      });
    }
  };

  const handleSaveAs = async () => {
    setSaveDropdownOpen(false);
    
    try {
      const workflow = serializeWorkflow(nodes, edges);
      const workflowJson = JSON.stringify(workflow, null, 2);

      if (supportsFileSystemAccess) {
        try {
          const handle = await window.showSaveFilePicker!({
            suggestedName: `workflow-${Date.now()}.json`,
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] }
            }]
          });

          const writable = await handle.createWritable();
          await writable.write(workflowJson);
          await writable.close();

          // Update current file handle
          setCurrentFileHandle(handle);

          addNotification({
            type: 'info',
            title: 'Workflow Saved',
            message: `Saved as ${handle.name}`,
          });
        } catch (error: any) {
          // User cancelled the picker
          if (error.name === 'AbortError') {
            return;
          }
          throw error;
        }
      } else {
        // Fallback: download file
        const filename = `workflow-${Date.now()}.json`;
        downloadWorkflow(filename);
        addNotification({
          type: 'info',
          title: 'Workflow Saved',
          message: `Saved as ${filename}`,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save workflow: ' + (error as Error).message,
      });
    }
  };

  const performLoad = async () => {
    try {
      let file: File;
      let fileHandle: FileSystemFileHandle | null = null;

      if (supportsFileSystemAccess) {
        try {
          const handles = await window.showOpenFilePicker!({
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] }
            }]
          });
          fileHandle = handles[0];
          file = await fileHandle.getFile();
        } catch (error: any) {
          // User cancelled the picker, fall back to file input
          if (error.name === 'AbortError') {
            setShowLoadWarning(false);
            setPendingLoadAction(null);
            return;
          }
          throw error;
        }
      } else {
        // Fallback: use file input
        return new Promise<void>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json';
          input.onchange = (e) => {
            const selectedFile = (e.target as HTMLInputElement).files?.[0];
            if (selectedFile) {
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const workflow = JSON.parse(event.target?.result as string);
                  const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(workflow);
                  setNodes(loadedNodes);
                  setEdges(loadedEdges);
                  setCurrentFileHandle(null); // Can't track file handle with file input
                  addNotification({
                    type: 'info',
                    title: 'Workflow Loaded',
                    message: `Loaded workflow with ${loadedNodes.length} node(s)`,
                  });
                  resolve();
                } catch (error) {
                  addNotification({
                    type: 'error',
                    title: 'Load Failed',
                    message: 'Failed to load workflow: ' + (error as Error).message,
                  });
                  resolve();
                }
              };
              reader.readAsText(selectedFile);
            } else {
              resolve();
            }
          };
          input.click();
          setShowLoadWarning(false);
          setPendingLoadAction(null);
        });
      }

      // Load file content
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflow = JSON.parse(event.target?.result as string);
          const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(workflow);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setCurrentFileHandle(fileHandle);
          addNotification({
            type: 'info',
            title: 'Workflow Loaded',
            message: `Loaded workflow with ${loadedNodes.length} node(s)`,
          });
        } catch (error) {
          addNotification({
            type: 'error',
            title: 'Load Failed',
            message: 'Failed to load workflow: ' + (error as Error).message,
          });
        }
      };
      reader.readAsText(file);
      setShowLoadWarning(false);
      setPendingLoadAction(null);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load workflow: ' + (error as Error).message,
      });
      setShowLoadWarning(false);
      setPendingLoadAction(null);
    }
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
    // Clear existing workflow first
    resetExecution();
    setNodes([]);
    setEdges([]);
    setCurrentFileHandle(null);
    
    // Use setTimeout to ensure ReactFlow processes the clearing before setting new nodes
    setTimeout(() => {
      // Create nodes with proper spacing (200px horizontal spacing)
      const startX = 100;
      const y = 200;
      const spacing = 250;
      const baseTimestamp = Date.now();

      // Helper function to create a node with default data
      let nodeCounter = 0;
      const createNodeWithDefaults = (nodeType: NodeType, position: { x: number; y: number }, label: string, overrides?: any) => {
      const id = `${nodeType}-${baseTimestamp}-${nodeCounter++}`;
      const defaultData = getDefaultNodeData(nodeType);
      return {
        id,
        type: 'custom' as const,
        position,
        data: {
          type: nodeType,
          label,
          ...defaultData,
          ...overrides,
        },
      };
      };

      // Start node
      const startNode = createNodeWithDefaults(NodeType.START, { x: startX, y }, 'Start');
      const startId = startNode.id;

      // Open Browser node
      const openBrowserNode = createNodeWithDefaults(
        NodeType.OPEN_BROWSER,
        { x: startX + spacing, y },
        'Open Browser',
        { headless: false, viewportWidth: 1280, viewportHeight: 720 }
      );
      const openBrowserId = openBrowserNode.id;

      // Navigation node
      const navigateNode = createNodeWithDefaults(
        NodeType.NAVIGATION,
        { x: startX + spacing * 2, y },
        'Navigation',
        { action: 'navigate', url: 'https://example.com', timeout: 30000, waitUntil: 'networkidle' }
      );
      const navigateId = navigateNode.id;

      // Wait node
      const waitNode = createNodeWithDefaults(
        NodeType.WAIT,
        { x: startX + spacing * 3, y },
        'Wait',
        { waitType: 'timeout', value: 2000 }
      );
      const waitId = waitNode.id;

      // Screenshot node
      const screenshotNode = createNodeWithDefaults(
        NodeType.SCREENSHOT,
        { x: startX + spacing * 4, y },
        'Screenshot',
        { fullPage: false }
      );
      const screenshotId = screenshotNode.id;

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

      // Set nodes and edges together to ensure ReactFlow updates properly
      setNodes([startNode, openBrowserNode, navigateNode, waitNode, screenshotNode]);
      setEdges(newEdges);
    }, 10);
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
    addNotification({
      type: 'info',
      title: 'Workflow Reset',
      message: 'Workflow has been reset to sample template',
    });
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
            onClick={() => setEdgesHidden(!edgesHidden)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
            title={edgesHidden ? 'Show connections' : 'Hide connections'}
          >
            {edgesHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
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
          <button
            onClick={() => navigateToFailedNode?.()}
            disabled={failedNodes.size === 0 || !navigateToFailedNode}
            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2 text-sm font-medium"
            title={failedNodes.size > 0 ? `Go to failed node (${failedNodes.size} failed) - Ctrl/Cmd+Shift+F` : 'No failed nodes'}
          >
            <ErrorIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
            Go to Failed Node
          </button>
          <div className="w-px h-6 bg-gray-700 mx-2" />
          <div className="relative flex items-center" ref={saveDropdownRef}>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-l flex items-center gap-2 text-sm border-r border-gray-600"
              title={currentFileHandle ? `Save to ${currentFileHandle.name}` : 'Save workflow'}
            >
              <SaveIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
              Save
            </button>
            <button
              onClick={() => setSaveDropdownOpen(!saveDropdownOpen)}
              className="px-1.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-r flex items-center text-sm"
              title="Save options"
            >
              <ChevronDown size={14} className={saveDropdownOpen ? 'rotate-180' : ''} />
            </button>
            {saveDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="p-1">
                  <button
                    onClick={handleSaveAs}
                    className="w-full px-3 py-2 text-sm text-white hover:bg-gray-700 rounded text-left flex items-center gap-2"
                  >
                    <SaveIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
                    Save As
                  </button>
                </div>
              </div>
            )}
          </div>
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
          <SettingsDropdown
            traceLogs={traceLogs}
            onTraceLogsChange={setTraceLogs}
            onReportSettingsClick={() => setShowReportSettings(true)}
            menuFixed={menuFixed}
            onMenuFixedChange={setMenuFixed}
          />
          <button
            onClick={() => {
              const url = window.location.origin + '/reports/history';
              window.open(url, '_blank');
            }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
            title="Go to Report History"
          >
            <HistoryIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
            Report History
          </button>
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
      {showReportSettings && (
        <ReportSettingsPopup onClose={() => setShowReportSettings(false)} />
      )}
      <NotificationContainer />
    </>
  );
}
