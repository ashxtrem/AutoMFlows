import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import TopBar from './components/TopBar';
import LeftSidebar, { LeftSidebarHandle } from './components/LeftSidebar';
import Canvas from './components/Canvas';
import RightSidebar from './components/RightSidebar';
import ReportHistory from './components/ReportHistory';
import WorkflowLibraryPage from './components/WorkflowLibraryPage';
import FloatingRunButton from './components/FloatingRunButton';
import InteractiveTour from './components/InteractiveTour';
import { useWorkflowStore } from './store/workflowStore';
import { useSettingsStore } from './store/settingsStore';
import NodeErrorPopup from './components/NodeErrorPopup';
import BrowserInstallErrorPopup from './components/BrowserInstallErrorPopup';
import ServerRestartWarningPopup from './components/ServerRestartWarningPopup';
import { useWorkflowAutoSave, useWorkflowLoad } from './hooks/useWorkflow';
import { useServerRestartWarning } from './hooks/useServerRestartWarning';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useBreakpointShortcut } from './hooks/useBreakpointShortcut';
import { useReportHistoryShortcut } from './hooks/useReportHistoryShortcut';
import { useFileShortcuts } from './hooks/useFileShortcuts';
import { useBuilderMode } from './hooks/useBuilderMode';
import { loadPlugins } from './plugins/loader';
import { getBackendPort } from './utils/getBackendPort';
import { initTheme, applyTheme } from './utils/theme';
import ActionListModal from './components/ActionListModal';
import BuilderModeMinimizedIcon from './components/BuilderModeMinimizedIcon';

function App() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const failedNodes = useWorkflowStore((state) => state.failedNodes);
  const errorPopupNodeId = useWorkflowStore((state) => state.errorPopupNodeId);
  const showErrorPopupForNode = useWorkflowStore((state) => state.showErrorPopupForNode);
  const executionStatus = useWorkflowStore((state) => state.executionStatus);
  const canvasReloading = useWorkflowStore((state) => state.canvasReloading);
  const pauseReason = useWorkflowStore((state) => state.pauseReason);
  const pausedNodeId = useWorkflowStore((state) => state.pausedNodeId);
  const builderModeActive = useWorkflowStore((state) => state.builderModeActive);
  const setBuilderModeActive = useWorkflowStore((state) => state.setBuilderModeActive);
  const resetBuilderModeActions = useWorkflowStore((state) => state.resetBuilderModeActions);
  const theme = useSettingsStore((state) => state.appearance.theme);
  const fontSize = useSettingsStore((state) => state.appearance.fontSize);
  const fontFamily = useSettingsStore((state) => state.appearance.fontFamily);
  const highContrast = useSettingsStore((state) => state.appearance.highContrast);
  
  // State for browser installation error popup
  const [browserInstallError, setBrowserInstallError] = useState<{ nodeId: string; browserName: string } | null>(null);
  
  // Server restart warning hook
  const serverRestartWarning = useServerRestartWarning();
  
  // Builder mode hook
  const builderMode = useBuilderMode();
  
  // Show builder icon when paused at breakpoint or when builder mode is minimized
  const showBuilderIcon = (pauseReason === 'breakpoint' && pausedNodeId !== null) || builderMode.isMinimized;
  const isMinimized = builderMode.isMinimized;
  
  // Pulse animation state for builder icon when it first appears at breakpoint
  const [builderIconJustAppeared, setBuilderIconJustAppeared] = useState(false);
  const prevShowBuilderIconRef = useRef(false);
  
  useEffect(() => {
    const shouldShowPulse = pauseReason === 'breakpoint' && pausedNodeId !== null && !builderModeActive;
    if (shouldShowPulse && !prevShowBuilderIconRef.current) {
      // Icon just appeared - trigger pulse animation
      setBuilderIconJustAppeared(true);
      // Reset pulse after animation duration (3 seconds)
      const timer = setTimeout(() => {
        setBuilderIconJustAppeared(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevShowBuilderIconRef.current = shouldShowPulse;
  }, [pauseReason, pausedNodeId, builderModeActive]);
  
  // Handle unified builder icon click
  const handleBuilderIconClick = useCallback(() => {
    if (isMinimized) {
      // Maximize the builder modal
      builderMode.handleMaximize();
    } else {
      // Open builder mode (paused at breakpoint)
      resetBuilderModeActions();
      setBuilderModeActive(true);
      builderMode.setShowModal(true);
    }
  }, [isMinimized, builderMode, resetBuilderModeActions, setBuilderModeActive]);
  
  // LeftSidebar ref for hiding on canvas click
  const leftSidebarRef = useRef<LeftSidebarHandle>(null);
  
  // Hide sidebar callback for Canvas
  const handleHideSidebar = useCallback(() => {
    if (leftSidebarRef.current) {
      leftSidebarRef.current.hide();
    }
  }, []);
  
  // Initialize theme system on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
    const cleanup = initTheme(theme);
    return cleanup;
  }, [theme]);
  
  // Apply high contrast mode (must be separate to override theme)
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    // Re-apply theme after high contrast change to ensure variables are updated
    applyTheme(theme);
  }, [highContrast, theme]);
  
  // Initial theme application on mount
  useEffect(() => {
    applyTheme(theme);
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    }
  }, []); // Run once on mount
  
  // Apply font size and family
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);
  
  useEffect(() => {
    document.documentElement.style.fontFamily = fontFamily;
  }, [fontFamily]);
  
  // Auto-save and load workflow
  useWorkflowAutoSave();
  useWorkflowLoad();
  
  // Undo/Redo keyboard shortcuts
  useUndoRedo();
  
  // Breakpoint keyboard shortcut (Ctrl+B / Cmd+B)
  useBreakpointShortcut();

  // Report history keyboard shortcut (Ctrl+H / Cmd+H)
  useReportHistoryShortcut();

  // File shortcuts (Ctrl+S, Ctrl+Shift+S, Ctrl+O / Cmd+S, Cmd+Shift+S, Cmd+O)
  useFileShortcuts();

  // Load plugins on mount
  useEffect(() => {
    const loadPluginData = async () => {
      try {
        const port = await getBackendPort();
        if (port) {
          await loadPlugins(port);
        }
      } catch (error) {
        console.error('Failed to load plugins:', error);
      }
    };
    
    loadPluginData();
  }, []);

  // Auto-open error popup only at end of flow: show the last failed node's error.
  // During execution, user can click on any failed node header to inspect errors manually.
  const prevExecutionStatusRef = useRef(executionStatus);
  useEffect(() => {
    const wasRunning = prevExecutionStatusRef.current === 'running';
    prevExecutionStatusRef.current = executionStatus;

    if (!wasRunning || executionStatus === 'running') return;

    // Execution just finished — check for failed nodes after a small delay
    // to ensure all node errors have been recorded by the store.
    setTimeout(() => {
      const currentFailedNodes = useWorkflowStore.getState().failedNodes;
      if (currentFailedNodes.size > 0) {
        const failedNodeIds = Array.from(currentFailedNodes.keys());
        const lastFailedNodeId = failedNodeIds[failedNodeIds.length - 1];
        const error = currentFailedNodes.get(lastFailedNodeId);
        const errorMessage = error?.message || '';

        const browserInstallMatch = errorMessage.match(/(Chromium|Firefox|Webkit|WebKit)\s+is\s+not\s+installed/i);
        if (browserInstallMatch) {
          let browserName = browserInstallMatch[1];
          if (browserName.toLowerCase() === 'webkit') {
            browserName = 'WebKit';
          }
          setBrowserInstallError({ nodeId: lastFailedNodeId, browserName });
        } else {
          showErrorPopupForNode(lastFailedNodeId);
        }
      }
    }, 200);
  }, [executionStatus, showErrorPopupForNode]);

  const handleCloseErrorPopup = useCallback(() => {
    showErrorPopupForNode(null);
  }, [showErrorPopupForNode]);

  const handleCloseBrowserInstallError = useCallback(() => {
    setBrowserInstallError(null);
  }, []);

  const errorPopupError = errorPopupNodeId ? failedNodes.get(errorPopupNodeId) : null;

  // Simple routing based on pathname
  const currentPath = window.location.pathname;
  const isReportHistory = currentPath === '/reports/history';
  const isWorkflowLibrary = currentPath === '/workflows';

  // If on report history page, render only that component
  if (isReportHistory) {
    return <ReportHistory />;
  }

  // If on workflow library page, render only that component
  if (isWorkflowLibrary) {
    return <WorkflowLibraryPage />;
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-canvas text-primary relative">
        {/* Global loader overlay */}
        {canvasReloading && (
          <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-primary text-sm">Updating canvas...</p>
            </div>
          </div>
        )}
        {errorPopupNodeId && errorPopupError && (
          <NodeErrorPopup
            nodeId={errorPopupNodeId}
            error={errorPopupError}
            onClose={handleCloseErrorPopup}
          />
        )}
        {browserInstallError && (
          <BrowserInstallErrorPopup
            nodeId={browserInstallError.nodeId}
            browserName={browserInstallError.browserName}
            onClose={handleCloseBrowserInstallError}
          />
        )}
        {serverRestartWarning.showWarning && (
          <ServerRestartWarningPopup
            onProceed={serverRestartWarning.handleProceed}
            onCancel={serverRestartWarning.handleCancel}
          />
        )}
        <TopBar />
        <FloatingRunButton />
        <LeftSidebar ref={leftSidebarRef} />
        <div className="flex flex-1 overflow-hidden">
          <Canvas hideSidebar={handleHideSidebar} />
          {selectedNode && <RightSidebar />}
        </div>
        <InteractiveTour />
        {/* Builder Mode Components */}
        {builderMode.showModal && !builderMode.isMinimized && (
          <ActionListModal
            recordedActions={builderMode.recordedActions}
            insertedActions={builderMode.insertedActions}
            isRecording={builderMode.isRecording}
            isMinimized={builderMode.isMinimized}
            onStartRecording={builderMode.startRecording}
            onStopRecording={builderMode.stopRecording}
            onInsertAction={builderMode.handleInsertAction}
            onEditAction={builderMode.handleEditAction}
            onUndo={builderMode.handleUndo}
            onRedo={builderMode.handleRedo}
            canUndo={builderMode.canUndo}
            canRedo={builderMode.canRedo}
            onMinimize={builderMode.handleMinimize}
            onClose={builderMode.handleClose}
            onClearActions={builderMode.handleClearActions}
            showOverlayVisibilityMessage={builderMode.showOverlayVisibilityMessage}
            onDismissOverlayMessage={() => builderMode.setShowOverlayVisibilityMessage(false)}
          />
        )}
        {/* Unified Builder Icon - Shows when minimized OR paused at breakpoint (but not when modal is open) */}
        {showBuilderIcon && !builderMode.showModal && (
          <BuilderModeMinimizedIcon
            actionCount={builderMode.recordedActions.length + builderMode.insertedActions.length}
            onMaximize={handleBuilderIconClick}
            isMinimized={isMinimized}
            showPulse={builderIconJustAppeared}
            zIndex={selectedNode ? 'z-20' : 'z-50'}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}

export default App;

