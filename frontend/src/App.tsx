import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import TopBar from './components/TopBar';
import LeftSidebar, { LeftSidebarHandle } from './components/LeftSidebar';
import Canvas from './components/Canvas';
import RightSidebar from './components/RightSidebar';
import ReportHistory from './components/ReportHistory';
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

  // Track dismissed popups to prevent auto-reopening
  const dismissedPopupRef = useRef<Set<string>>(new Set());
  
  // Show error popup when a node fails (only open new popup, don't auto-close or reopen dismissed ones)
  const prevFailedNodesRef = useRef<Map<string, any>>(new Map());
  useEffect(() => {
    // Only auto-open if:
    // 1. There are failed nodes
    // 2. No popup is currently open
    // 3. A new node failed (failedNodes size increased)
    const hasNewFailedNode = failedNodes.size > prevFailedNodesRef.current.size;
    if (failedNodes.size > 0 && !errorPopupNodeId && !browserInstallError && hasNewFailedNode) {
      // Find first failed node that hasn't been dismissed
      const firstFailedNodeId = Array.from(failedNodes.keys()).find(
        nodeId => !dismissedPopupRef.current.has(nodeId)
      );
      
      if (firstFailedNodeId) {
        const error = failedNodes.get(firstFailedNodeId);
        const errorMessage = error?.message || '';
        
        // Check if this is a browser installation error
        const browserInstallMatch = errorMessage.match(/(Chromium|Firefox|Webkit|WebKit)\s+is\s+not\s+installed/i);
        if (browserInstallMatch) {
          let browserName = browserInstallMatch[1];
          // Normalize Webkit to WebKit
          if (browserName.toLowerCase() === 'webkit') {
            browserName = 'WebKit';
          }
          setBrowserInstallError({ nodeId: firstFailedNodeId, browserName });
        } else {
          showErrorPopupForNode(firstFailedNodeId);
        }
      }
    }
    // Update ref to track previous state
    prevFailedNodesRef.current = new Map(failedNodes);
    // Don't auto-close popup when failedNodes becomes empty - let user dismiss it manually
  }, [failedNodes, errorPopupNodeId, browserInstallError, showErrorPopupForNode]);

  const handleCloseErrorPopup = useCallback(() => {
    if (errorPopupNodeId) {
      // Mark this node's popup as dismissed to prevent auto-reopening
      dismissedPopupRef.current.add(errorPopupNodeId);
    }
    showErrorPopupForNode(null);
  }, [showErrorPopupForNode, errorPopupNodeId]);

  const handleCloseBrowserInstallError = useCallback(() => {
    if (browserInstallError) {
      // Mark this node's popup as dismissed to prevent auto-reopening
      dismissedPopupRef.current.add(browserInstallError.nodeId);
    }
    setBrowserInstallError(null);
  }, [browserInstallError]);

  const errorPopupError = errorPopupNodeId ? failedNodes.get(errorPopupNodeId) : null;

  // Simple routing based on pathname
  const currentPath = window.location.pathname;
  const isReportHistory = currentPath === '/reports/history';

  // If on report history page, render only that component
  if (isReportHistory) {
    return <ReportHistory />;
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

