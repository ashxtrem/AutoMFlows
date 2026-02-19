import { useState, useEffect, useRef } from 'react';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayCircleFilledWhiteTwoToneIcon from '@mui/icons-material/PlayCircleFilledWhiteTwoTone';
import { Eye, EyeOff, ChevronDown, FolderOpen } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { getSampleTemplate } from '../utils/sampleTemplate';
import { useSettingsStore } from '../store/settingsStore';
import { useExecution } from '../hooks/useExecution';
import { serializeWorkflow, deserializeWorkflow } from '../utils/serialization';
import ValidationErrorPopup from './ValidationErrorPopup';
import ResetWarning from './ResetWarning';
import LoadWarning from './LoadWarning';
import ReportSettingsPopup from './ReportSettingsPopup';
import NotificationContainer from './NotificationContainer';
import BreakpointSettings from './BreakpointSettings';
import CanvasSettingsSubmenu from './CanvasSettingsSubmenu';
import AppearanceSettingsSubmenu from './AppearanceSettingsSubmenu';
import NotificationSettingsSubmenu from './NotificationSettingsSubmenu';
import MemoryManagementSubmenu from './MemoryManagementSubmenu';
import KeyBindingsModal from './KeyBindingsModal';
import { useNotificationStore } from '../store/notificationStore';
import Tooltip from './Tooltip';
import { getBackendPort, getBackendBaseUrl } from '../utils/getBackendPort';

const STORAGE_KEY_TRACE_LOGS = 'automflows_trace_logs';

export default function TopBar() {
  const { nodes, edges, groups, setNodes, setEdges, setGroups, resetExecution, edgesHidden, setEdgesHidden, selectedNode, followModeEnabled, setFollowModeEnabled, workflowFileName, setWorkflowFileName, setHasUnsavedChanges, setFitViewRequested } = useWorkflowStore();
  const { validationErrors, setValidationErrors } = useExecution();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { tourCompleted, startTour, resetTour } = useSettingsStore();
  
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showLoadWarning, setShowLoadWarning] = useState(false);
  const [showReportSettings, setShowReportSettings] = useState(false);
  const [showKeyBindingsModal, setShowKeyBindingsModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsSubmenuOpen, setIsSettingsSubmenuOpen] = useState(false);
  const [isBreakpointSubmenuOpen, setIsBreakpointSubmenuOpen] = useState(false);
  const [currentSettingsSubmenu, setCurrentSettingsSubmenu] = useState<'main' | 'canvas' | 'appearance' | 'notifications' | 'memory'>('main');
  const [pendingLoadAction, setPendingLoadAction] = useState<(() => void) | null>(null);
  const [currentFileHandle, setCurrentFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);
  const saveDropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsSubmenuRef = useRef<HTMLDivElement>(null);
  const breakpointSubmenuRef = useRef<HTMLDivElement>(null);
  
  // Check for File System Access API support
  const supportsFileSystemAccess = typeof window !== 'undefined' && 
    'showOpenFilePicker' in window && 
    'showSaveFilePicker' in window;
  
  // Load trace logs state from localStorage on mount
  // Default to true (enabled) if not set, so trace logs are enabled by default
  const [traceLogs, setTraceLogs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TRACE_LOGS);
    // If not set, default to true (enabled)
    if (saved === null) {
      return true;
    }
    return saved === 'true';
  });

  // Track previous trace logs state to detect changes
  const prevTraceLogsRef = useRef(traceLogs);

  // Save trace logs state to localStorage when it changes and update backend if execution is running
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TRACE_LOGS, String(traceLogs));
    
    // Show notification when trace logs setting changes
    if (prevTraceLogsRef.current !== traceLogs) {
      addNotification({
        type: 'settings',
        title: 'Settings Applied',
        details: [traceLogs ? 'Trace logs enabled' : 'Trace logs disabled'],
      });
      prevTraceLogsRef.current = traceLogs;
      
      // Dynamically update trace logs in running execution
      const updateTraceLogs = async () => {
        try {
          // Get backend port
          const portResponse = await fetch('/.automflows-port');
          if (portResponse.ok) {
            const portText = await portResponse.text();
            const port = parseInt(portText.trim(), 10);
            if (!isNaN(port) && port > 0) {
              // Call API to toggle trace logs
              const response = await fetch(`${getBackendBaseUrl(port)}/api/workflows/execution/trace-logs`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ enabled: traceLogs }),
              });
              
              if (!response.ok) {
                // If execution is not running, that's fine - just log it
                const data = await response.json();
                if (data.message !== 'No execution running') {
                  console.warn('Failed to update trace logs:', data.message);
                }
              }
            }
          }
        } catch (error) {
          // Silently fail if backend is not available or execution is not running
          // This is expected when no execution is active
        }
      };
      
      updateTraceLogs();
    }
  }, [traceLogs, addNotification]);

  // Track previous follow mode state to detect changes
  const prevFollowModeRef = useRef(followModeEnabled);

  // Show notification when follow mode setting changes
  useEffect(() => {
    if (prevFollowModeRef.current !== followModeEnabled) {
      addNotification({
        type: 'settings',
        title: 'Settings Applied',
        details: [followModeEnabled ? 'Follow mode enabled' : 'Follow mode disabled'],
      });
      prevFollowModeRef.current = followModeEnabled;
    }
  }, [followModeEnabled, addNotification]);


  // Handle click outside menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      const targetNode = target as Node;
      
      // Don't close if clicking on the FAB button itself
      const fabButton = target?.closest('[data-fab-button]');
      if (fabButton) {
        return;
      }
      
      // Check if click is inside settings submenu - if so, don't close
      if (settingsSubmenuRef.current && settingsSubmenuRef.current.contains(targetNode)) {
        return; // Let the click handlers inside the submenu handle the action
      }
      
      // Check if click is on Settings button in main menu
      const settingsButton = target?.closest('[data-settings-button]');
      if (settingsButton) {
        return; // Let the Settings button handler toggle the submenu
      }
      
      // Handle save dropdown click outside
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(targetNode)) {
        setSaveDropdownOpen(false);
      }
      
      // Handle settings submenu click outside
      if (isSettingsSubmenuOpen && settingsSubmenuRef.current && !settingsSubmenuRef.current.contains(targetNode)) {
        setIsSettingsSubmenuOpen(false);
        setCurrentSettingsSubmenu('main');
      }
      
      // Handle breakpoint submenu click outside
      if (isBreakpointSubmenuOpen && breakpointSubmenuRef.current && !breakpointSubmenuRef.current.contains(targetNode)) {
        setIsBreakpointSubmenuOpen(false);
      }
      
      // Handle menu click outside
      if (menuRef.current && !menuRef.current.contains(targetNode)) {
        // If clicking outside main menu, close both menu and submenu
        setIsMenuOpen(false);
        setIsSettingsSubmenuOpen(false);
        setIsBreakpointSubmenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (saveDropdownOpen) {
          setSaveDropdownOpen(false);
        } else if (isSettingsSubmenuOpen) {
          setIsSettingsSubmenuOpen(false);
        } else if (isMenuOpen) {
          setIsMenuOpen(false);
        }
      }
    };

    if (isMenuOpen || saveDropdownOpen || isSettingsSubmenuOpen) {
      // Use mousedown instead of click to avoid interfering with button clicks
      document.addEventListener('mousedown', handleClickOutside, false);
      document.addEventListener('touchstart', handleClickOutside, false);
      document.addEventListener('keydown', handleEscapeKey);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside, false);
        document.removeEventListener('touchstart', handleClickOutside, false);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isMenuOpen, saveDropdownOpen, isSettingsSubmenuOpen]);

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
    const workflow = serializeWorkflow(nodes, edges, groups);
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
    setIsMenuOpen(false);
    
    try {
      const workflow = serializeWorkflow(nodes, edges, groups);
      const workflowJson = JSON.stringify(workflow, null, 2);

      if (supportsFileSystemAccess && currentFileHandle) {
        // Write directly to the file handle
        try {
          const writable = await currentFileHandle.createWritable();
          await writable.write(workflowJson);
          await writable.close();
          
          setWorkflowFileName(currentFileHandle.name);
          setHasUnsavedChanges(false);
          
          addNotification({
            type: 'info',
            title: 'Workflow Saved',
            message: `Saved to ${currentFileHandle.name}`,
          });
        } catch (error) {
          // If writing fails (e.g., permission denied), fall back to Save As
          console.warn('Failed to write to file handle:', error);
          const fileName = workflowFileName !== 'Untitled Workflow' ? workflowFileName : undefined;
          await handleSaveAs(fileName);
        }
      } else {
        // Fallback: use Save As behavior
        if (currentFileHandle) {
          // Try to use the filename from the handle
          downloadWorkflow(currentFileHandle.name);
          setWorkflowFileName(currentFileHandle.name);
          setHasUnsavedChanges(false);
          addNotification({
            type: 'info',
            title: 'Workflow Saved',
            message: `Saved as ${currentFileHandle.name}`,
          });
        } else {
          // No file handle, use Save As with persisted filename if available
          const fileName = workflowFileName !== 'Untitled Workflow' ? workflowFileName : undefined;
          await handleSaveAs(fileName);
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

  const handleSaveAs = async (suggestedFileName?: string) => {
    setSaveDropdownOpen(false);
    setIsMenuOpen(false);
    
    try {
      const workflow = serializeWorkflow(nodes, edges, groups);
      const workflowJson = JSON.stringify(workflow, null, 2);

      // Determine filename to use: parameter > persisted filename (if not Untitled) > default
      const fileName = suggestedFileName || 
                       (workflowFileName !== 'Untitled Workflow' ? workflowFileName : undefined) ||
                       `workflow-${Date.now()}.json`;

      if (supportsFileSystemAccess) {
        try {
          const handle = await window.showSaveFilePicker!({
            suggestedName: fileName,
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
          setWorkflowFileName(handle.name);
          setHasUnsavedChanges(false);

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
        downloadWorkflow(fileName);
        setWorkflowFileName(fileName);
        setHasUnsavedChanges(false);
        addNotification({
          type: 'info',
          title: 'Workflow Saved',
          message: `Saved as ${fileName}`,
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
                  const { nodes: loadedNodes, edges: loadedEdges, groups: loadedGroups } = deserializeWorkflow(workflow);
                  setNodes(loadedNodes);
                  setEdges(loadedEdges);
                  if (loadedGroups) {
                    setGroups(loadedGroups);
                  }
                  setCurrentFileHandle(null); // Can't track file handle with file input
                  const fileName = file.name || 'Untitled Workflow';
                  setWorkflowFileName(fileName);
                  setHasUnsavedChanges(false);
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
          const { nodes: loadedNodes, edges: loadedEdges, groups: loadedGroups } = deserializeWorkflow(workflow);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          if (loadedGroups) {
            setGroups(loadedGroups);
          } else {
            setGroups([]); // Clear groups if not present
          }
          setCurrentFileHandle(fileHandle);
          // Extract filename from file handle or file name
          const fileName = fileHandle?.name || file.name || 'Untitled Workflow';
          setWorkflowFileName(fileName);
          setHasUnsavedChanges(false);
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

  // Handle keyboard shortcut events - use refs to access latest handlers
  const handleSaveRef = useRef(handleSave);
  const handleSaveAsRef = useRef(handleSaveAs);
  const handleLoadRef = useRef(handleLoad);
  
  // Update refs when handlers change
  useEffect(() => {
    handleSaveRef.current = handleSave;
    handleSaveAsRef.current = handleSaveAs;
    handleLoadRef.current = handleLoad;
  }, [handleSave, handleSaveAs, handleLoad]);
  
  useEffect(() => {
    const handleSaveEvent = () => {
      handleSaveRef.current();
    };
    
    const handleSaveAsEvent = () => {
      handleSaveAsRef.current();
    };
    
    const handleOpenEvent = () => {
      handleLoadRef.current();
    };
    
    window.addEventListener('workflow-save', handleSaveEvent);
    window.addEventListener('workflow-save-as', handleSaveAsEvent);
    window.addEventListener('workflow-open', handleOpenEvent);
    
    return () => {
      window.removeEventListener('workflow-save', handleSaveEvent);
      window.removeEventListener('workflow-save-as', handleSaveAsEvent);
      window.removeEventListener('workflow-open', handleOpenEvent);
    };
  }, []);

  const loadSampleTemplate = () => {
    // Clear existing workflow first
    resetExecution();
    setNodes([]);
    setEdges([]);
    setGroups([]); // Clear groups when resetting template
    setCurrentFileHandle(null);
    setWorkflowFileName('Untitled Workflow');
    setHasUnsavedChanges(false);
    
    // Use setTimeout to ensure ReactFlow processes the clearing before setting new nodes
    setTimeout(() => {
      const { nodes: templateNodes, edges: templateEdges } = getSampleTemplate();
      setNodes(templateNodes);
      setEdges(templateEdges);
      setFitViewRequested(true);
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
      {/* Builder Icon is now handled by unified BuilderModeMinimizedIcon component in App.tsx */}

      {/* FAB Button */}
      <Tooltip content="Menu">
        <button
          data-fab-button
          data-tour="menu-button"
          onClick={() => {
            setIsMenuOpen(!isMenuOpen);
            if (isMenuOpen) {
              setIsSettingsSubmenuOpen(false);
              setCurrentSettingsSubmenu('main');
            }
          }}
          className={`fixed bottom-6 right-6 w-14 h-14 bg-surface hover:bg-surfaceHighlight border border-border text-primary rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${
            selectedNode ? 'z-20' : 'z-50'
          }`}
        >
          <MenuIcon sx={{ fontSize: '24px', color: '#e5e7eb' }} />
        </button>
      </Tooltip>

      {/* Backdrop overlay */}
      {isMenuOpen && (
        <div
          className={`fixed inset-0 bg-black/20 backdrop-blur-sm ${
            selectedNode ? 'z-10' : 'z-40'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Expandable Menu Panel */}
      <div
        ref={menuRef}
        className={`fixed bottom-24 right-6 w-80 bg-surface border border-border rounded-lg shadow-2xl transition-all duration-300 overflow-hidden ${
          selectedNode ? 'z-20' : 'z-50'
        } ${
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="p-4 space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
          {/* Header */}
          <div className="pb-2 border-b border-border mb-2">
            <h2 className="text-lg font-bold text-primary">AutoMFlows</h2>
            <span className="text-xs text-secondary">Workspace</span>
          </div>


          {/* File Operations Section */}
          <div className="space-y-1">
            <div className="relative" ref={saveDropdownRef}>
              <div className="flex gap-1">
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded-l flex items-center gap-3 text-sm transition-colors"
                  title={currentFileHandle ? `Save to ${currentFileHandle.name}` : 'Save workflow'}
                >
                  <SaveIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
                  Save
                </button>
                <button
                  onClick={() => setSaveDropdownOpen(!saveDropdownOpen)}
                  className="px-2 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded-r flex items-center transition-colors"
                  title="Save options"
                >
                  <ChevronDown size={14} className={saveDropdownOpen ? 'rotate-180' : ''} />
                </button>
              </div>
              {saveDropdownOpen && (
                <div className={`absolute left-0 top-full mt-1 w-full bg-surface border border-border rounded-lg shadow-xl ${
                  selectedNode ? 'z-20' : 'z-50'
                }`}>
                  <div className="p-1">
                    <button
                      onClick={() => handleSaveAs()}
                      className="w-full px-3 py-2 text-sm text-primary hover:bg-surfaceHighlight rounded text-left flex items-center gap-2"
                    >
                      <SaveIcon sx={{ fontSize: '16px', color: '#ffffff' }} className="flex-shrink-0" />
                      Save As
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setSaveDropdownOpen(false);
                setIsMenuOpen(false);
                handleLoad();
              }}
              className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
            >
              <UploadFileIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
              Load
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleReset();
              }}
              className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
            >
              <RefreshIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
              Reset
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-2" />

          {/* View Section */}
          <div className="space-y-1">
            <button
              onClick={() => setEdgesHidden(!edgesHidden)}
              className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
              title={edgesHidden ? 'Show connections' : 'Hide connections'}
            >
              {edgesHidden ? <EyeOff size={18} /> : <Eye size={18} />}
              {edgesHidden ? 'Show Connections' : 'Hide Connections'}
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                const url = window.location.origin + '/reports/history';
                window.open(url, '_blank');
              }}
              className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
              title="Go to Report History"
            >
              <AssessmentIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
              Report History
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                const url = window.location.origin + '/workflows';
                window.open(url, '_blank');
              }}
              className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
              title="Go to Workflow Library & Batch Runner"
            >
              <FolderOpen size={18} className="flex-shrink-0" />
              Workflow Library
            </button>
            <button
              onClick={async () => {
                setIsMenuOpen(false);
                const port = await getBackendPort();
                window.open(`${getBackendBaseUrl(port)}/api-docs`, '_blank');
              }}
              className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
              title="Open API documentation (Swagger)"
            >
              <MenuIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
              API Docs
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-2" />

          {/* Tour Section */}
          <div className="space-y-1">
            {!tourCompleted ? (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  startTour();
                }}
                className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
                title="Take interactive tour"
              >
                <PlayCircleFilledWhiteTwoToneIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
                Take Tour
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  resetTour();
                }}
                className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
                title="Restart interactive tour"
              >
                <RefreshIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
                Restart Tour
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-2" />

          {/* Settings Section - Last Item */}
          <div className="space-y-1">
            <button
              data-settings-button
              onClick={() => setIsSettingsSubmenuOpen(!isSettingsSubmenuOpen)}
              className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
              title="Settings"
            >
              <SettingsIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Settings Submenu - Appears to the left of main menu */}
      {isSettingsSubmenuOpen && (
        <div
          ref={settingsSubmenuRef}
          className={`fixed bottom-24 right-[22rem] w-64 bg-surface border border-border rounded-lg shadow-2xl transition-all duration-300 ${
            selectedNode ? 'z-20' : 'z-50'
          }`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {currentSettingsSubmenu === 'main' && (
            <div className="p-3 space-y-3">
              {/* Trace Logs Toggle */}
              <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm text-primary font-medium">Trace Logs</span>
                <label 
                  className="relative inline-flex items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={traceLogs}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newValue = e.target.checked;
                      setTraceLogs(newValue);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
                      traceLogs ? 'bg-green-600' : 'bg-surfaceHighlight'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                        traceLogs ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Follow Mode Toggle */}
              <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm text-primary font-medium">Follow Mode</span>
                <label 
                  className="relative inline-flex items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={followModeEnabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newValue = e.target.checked;
                      setFollowModeEnabled(newValue);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
                      followModeEnabled ? 'bg-green-600' : 'bg-surfaceHighlight'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                        followModeEnabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Settings Categories */}
              <div className="border-t border-border pt-3 mt-2 space-y-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSettingsSubmenu('canvas');
                  }}
                  className="w-full px-3 py-2 text-sm bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded-md transition-colors text-left"
                >
                  Canvas
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSettingsSubmenu('appearance');
                  }}
                  className="w-full px-3 py-2 text-sm bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded-md transition-colors text-left"
                >
                  Appearance
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSettingsSubmenu('notifications');
                  }}
                  className="w-full px-3 py-2 text-sm bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded-md transition-colors text-left"
                >
                  Notifications
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSettingsSubmenu('memory');
                  }}
                  className="w-full px-3 py-2 text-sm bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded-md transition-colors text-left"
                >
                  Memory Management
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsSubmenuOpen(false);
                    window.location.href = window.location.origin + '/workflows';
                  }}
                  className="w-full px-3 py-2 text-sm bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded-md transition-colors text-left flex items-center gap-2"
                >
                  <FolderOpen size={16} />
                  Workflow Library
                </button>
              </div>

              {/* Breakpoint Settings Button */}
              <div className="border-t border-border pt-3 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBreakpointSubmenuOpen(!isBreakpointSubmenuOpen);
                  }}
                  className="w-full px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors flex items-center justify-between"
                >
                  <span>Breakpoint</span>
                  <ChevronDown size={16} className={`transition-transform ${isBreakpointSubmenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {/* Report Settings Button */}
              <div className="border-t border-border pt-3 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsSubmenuOpen(false);
                    setIsMenuOpen(false);
                    setShowReportSettings(true);
                  }}
                  className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Report Settings
                </button>
              </div>
              {/* Key Bindings Button */}
              <div className="border-t border-border pt-3 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsSubmenuOpen(false);
                    setIsMenuOpen(false);
                    setShowKeyBindingsModal(true);
                  }}
                  className="w-full px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  Key Bindings
                </button>
              </div>
            </div>
          )}
          
          {currentSettingsSubmenu === 'canvas' && (
            <CanvasSettingsSubmenu onBack={() => setCurrentSettingsSubmenu('main')} />
          )}
          
          {currentSettingsSubmenu === 'appearance' && (
            <AppearanceSettingsSubmenu onBack={() => setCurrentSettingsSubmenu('main')} />
          )}
          
          {currentSettingsSubmenu === 'notifications' && (
            <NotificationSettingsSubmenu onBack={() => setCurrentSettingsSubmenu('main')} />
          )}
          
          {currentSettingsSubmenu === 'memory' && (
            <MemoryManagementSubmenu onBack={() => setCurrentSettingsSubmenu('main')} />
          )}
        </div>
      )}

      {/* Breakpoint Settings Submenu */}
      {isBreakpointSubmenuOpen && (
        <div
          ref={breakpointSubmenuRef}
          className={`fixed bottom-24 right-[22rem] w-80 bg-surface border border-border rounded-lg shadow-2xl transition-all duration-300 ${
            selectedNode ? 'z-20' : 'z-50'
          }`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-primary">Breakpoint Settings</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBreakpointSubmenuOpen(false);
                }}
                className="text-secondary hover:text-primary"
              >
                ×
              </button>
            </div>
            <BreakpointSettings />
          </div>
        </div>
      )}

      {/* Popups and Warnings */}
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
      {showKeyBindingsModal && (
        <KeyBindingsModal onClose={() => setShowKeyBindingsModal(false)} />
      )}
      <NotificationContainer />
    </>
  );
}
