import { useState, useEffect, useRef } from 'react';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayCircleFilledWhiteTwoToneIcon from '@mui/icons-material/PlayCircleFilledWhiteTwoTone';
import { Eye, EyeOff, ChevronDown, FolderOpen } from 'lucide-react';
import { WorkflowMetadata } from '@automflows/shared';
import { useWorkflowStore } from '../store/workflowStore';
import { getSampleTemplate } from '../utils/sampleTemplate';
import { useSettingsStore } from '../store/settingsStore';
import { useExecution } from '../hooks/useExecution';
import { serializeWorkflow, deserializeWorkflow } from '../utils/serialization';
import ValidationErrorPopup from './ValidationErrorPopup';
import ResetWarning from './ResetWarning';
import LoadWarning from './LoadWarning';
import NotificationContainer from './NotificationContainer';
import SettingsModal from './SettingsModal';
import { useNotificationStore } from '../store/notificationStore';
import Tooltip from './Tooltip';
import { getBackendPort, getBackendBaseUrl } from '../utils/getBackendPort';

export default function TopBar() {
  const { nodes, edges, groups, setNodes, setEdges, setGroups, resetExecution, edgesHidden, setEdgesHidden, selectedNode, followModeEnabled, workflowFileName, setWorkflowFileName, setHasUnsavedChanges, setFitViewRequested, workflowMetadata, setWorkflowMetadata } = useWorkflowStore();
  const { validationErrors, setValidationErrors } = useExecution();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { tourCompleted, startTour, resetTour } = useSettingsStore();
  
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showLoadWarning, setShowLoadWarning] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingLoadAction, setPendingLoadAction] = useState<(() => void) | null>(null);
  const [currentFileHandle, setCurrentFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);
  const [authorName, setAuthorName] = useState<string>(() => {
    try {
      return localStorage.getItem('automflows-author') || '';
    } catch {
      return '';
    }
  });
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const saveDropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Check for File System Access API support
  const supportsFileSystemAccess = typeof window !== 'undefined' && 
    'showOpenFilePicker' in window && 
    'showSaveFilePicker' in window;
  
  // Track previous follow mode state to detect changes
  const prevFollowModeRef = useRef(followModeEnabled);

  // Show notification when follow mode setting changes (from any source)
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

  // Seed author name from backend system-info if not already set
  useEffect(() => {
    if (authorName) return;
    (async () => {
      try {
        const port = await getBackendPort();
        const res = await fetch(`${getBackendBaseUrl(port)}/api/system-info`);
        if (res.ok) {
          const info = await res.json();
          if (info.username && !localStorage.getItem('automflows-author')) {
            setAuthorName(info.username);
            localStorage.setItem('automflows-author', info.username);
          }
          if (info.appVersion) {
            setAppVersion(info.appVersion);
          }
        }
      } catch {
        // Backend unavailable
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAuthorName = () => {
    setIsEditingAuthor(false);
    const trimmed = authorName.trim() || 'Unknown';
    setAuthorName(trimmed);
    try {
      localStorage.setItem('automflows-author', trimmed);
    } catch {
      // localStorage unavailable
    }
  };

  const buildMetadata = (): WorkflowMetadata => {
    const now = new Date().toISOString();
    const existing = workflowMetadata;
    return {
      ...existing,
      name: workflowFileName !== 'Untitled Workflow' ? workflowFileName.replace(/\.json$/i, '') : existing?.name,
      author: authorName || existing?.author || 'Unknown',
      version: (existing?.version ?? 0) + 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      automflowsVersion: appVersion || existing?.automflowsVersion,
    };
  };

  // Handle click outside menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      const targetNode = target as Node;
      
      const fabButton = target?.closest('[data-fab-button]');
      if (fabButton) return;
      
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(targetNode)) {
        setSaveDropdownOpen(false);
      }
      
      if (menuRef.current && !menuRef.current.contains(targetNode)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (saveDropdownOpen) {
          setSaveDropdownOpen(false);
        } else if (isMenuOpen) {
          setIsMenuOpen(false);
        }
      }
    };

    if (isMenuOpen || saveDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside, false);
      document.addEventListener('touchstart', handleClickOutside, false);
      document.addEventListener('keydown', handleEscapeKey);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside, false);
        document.removeEventListener('touchstart', handleClickOutside, false);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isMenuOpen, saveDropdownOpen]);

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

  const downloadWorkflow = (filename: string, metadata?: WorkflowMetadata) => {
    const workflow = serializeWorkflow(nodes, edges, groups, metadata);
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
      const metadata = buildMetadata();
      const workflow = serializeWorkflow(nodes, edges, groups, metadata);
      const workflowJson = JSON.stringify(workflow, null, 2);

      if (supportsFileSystemAccess && currentFileHandle) {
        try {
          const writable = await currentFileHandle.createWritable();
          await writable.write(workflowJson);
          await writable.close();
          
          setWorkflowFileName(currentFileHandle.name);
          setHasUnsavedChanges(false);
          setWorkflowMetadata(metadata);
          
          addNotification({
            type: 'info',
            title: 'Workflow Saved',
            message: `Saved to ${currentFileHandle.name} (v${metadata.version})`,
          });
        } catch (error) {
          console.warn('Failed to write to file handle:', error);
          const fileName = workflowFileName !== 'Untitled Workflow' ? workflowFileName : undefined;
          await handleSaveAs(fileName);
        }
      } else {
        if (currentFileHandle) {
          downloadWorkflow(currentFileHandle.name, metadata);
          setWorkflowFileName(currentFileHandle.name);
          setHasUnsavedChanges(false);
          setWorkflowMetadata(metadata);
          addNotification({
            type: 'info',
            title: 'Workflow Saved',
            message: `Saved as ${currentFileHandle.name} (v${metadata.version})`,
          });
        } else {
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
      const metadata = buildMetadata();
      const workflow = serializeWorkflow(nodes, edges, groups, metadata);
      const workflowJson = JSON.stringify(workflow, null, 2);

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

          setCurrentFileHandle(handle);
          setWorkflowFileName(handle.name);
          setHasUnsavedChanges(false);
          setWorkflowMetadata(metadata);

          addNotification({
            type: 'info',
            title: 'Workflow Saved',
            message: `Saved as ${handle.name} (v${metadata.version})`,
          });
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return;
          }
          throw error;
        }
      } else {
        downloadWorkflow(fileName, metadata);
        setWorkflowFileName(fileName);
        setHasUnsavedChanges(false);
        setWorkflowMetadata(metadata);
        addNotification({
          type: 'info',
          title: 'Workflow Saved',
          message: `Saved as ${fileName} (v${metadata.version})`,
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
                  const { nodes: loadedNodes, edges: loadedEdges, groups: loadedGroups, metadata: loadedMetadata } = deserializeWorkflow(workflow);
                  setNodes(loadedNodes);
                  setEdges(loadedEdges);
                  if (loadedGroups) {
                    setGroups(loadedGroups);
                  }
                  setWorkflowMetadata(loadedMetadata);
                  setCurrentFileHandle(null);
                  const fileName = selectedFile.name || 'Untitled Workflow';
                  setWorkflowFileName(fileName);
                  setHasUnsavedChanges(false);
                  addNotification({
                    type: 'info',
                    title: 'Workflow Loaded',
                    message: `Loaded workflow with ${loadedNodes.length} node(s)${loadedMetadata?.version ? ` (v${loadedMetadata.version})` : ''}`,
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

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflow = JSON.parse(event.target?.result as string);
          const { nodes: loadedNodes, edges: loadedEdges, groups: loadedGroups, metadata: loadedMetadata } = deserializeWorkflow(workflow);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          if (loadedGroups) {
            setGroups(loadedGroups);
          } else {
            setGroups([]);
          }
          setWorkflowMetadata(loadedMetadata);
          setCurrentFileHandle(fileHandle);
          const fileName = fileHandle?.name || file.name || 'Untitled Workflow';
          setWorkflowFileName(fileName);
          setHasUnsavedChanges(false);
          addNotification({
            type: 'info',
            title: 'Workflow Loaded',
            message: `Loaded workflow with ${loadedNodes.length} node(s)${loadedMetadata?.version ? ` (v${loadedMetadata.version})` : ''}`,
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
    resetExecution();
    setNodes([]);
    setEdges([]);
    setGroups([]);
    setWorkflowMetadata(undefined);
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
          onClick={() => setIsMenuOpen(!isMenuOpen)}
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
            {isEditingAuthor ? (
              <input
                autoFocus
                className="text-xs bg-transparent border-b border-accent text-primary outline-none w-full"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onBlur={saveAuthorName}
                onKeyDown={(e) => { if (e.key === 'Enter') saveAuthorName(); }}
                placeholder="Enter author name"
              />
            ) : (
              <span
                className="text-xs text-secondary cursor-pointer hover:text-primary transition-colors"
                onClick={() => setIsEditingAuthor(true)}
                title="Click to edit author name"
              >
                {authorName || 'Workspace'}
              </span>
            )}
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
              onClick={() => {
                setIsMenuOpen(false);
                setShowSettingsModal(true);
              }}
              className="w-full px-4 py-2.5 bg-surfaceHighlight hover:bg-surfaceHighlight text-primary rounded flex items-center gap-3 text-sm transition-colors"
              title="Settings"
            >
              <SettingsIcon sx={{ fontSize: '18px', color: '#ffffff' }} className="flex-shrink-0" />
              Settings
            </button>
          </div>
        </div>
      </div>

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
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
      <NotificationContainer />
    </>
  );
}
