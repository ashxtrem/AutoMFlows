import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import TopBar from './components/TopBar';
import LeftSidebar from './components/LeftSidebar';
import Canvas from './components/Canvas';
import RightSidebar from './components/RightSidebar';
import ReportHistory from './components/ReportHistory';
import FloatingRunButton from './components/FloatingRunButton';
import { useWorkflowStore } from './store/workflowStore';
import { useSettingsStore } from './store/settingsStore';
import NodeErrorPopup from './components/NodeErrorPopup';
import BrowserInstallErrorPopup from './components/BrowserInstallErrorPopup';
import { useWorkflowAutoSave, useWorkflowLoad } from './hooks/useWorkflow';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useBreakpointShortcut } from './hooks/useBreakpointShortcut';
import { useReportHistoryShortcut } from './hooks/useReportHistoryShortcut';
import { loadPlugins } from './plugins/loader';
import { getBackendPort } from './utils/getBackendPort';
import { initTheme, applyTheme } from './utils/theme';

function App() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const failedNodes = useWorkflowStore((state) => state.failedNodes);
  const errorPopupNodeId = useWorkflowStore((state) => state.errorPopupNodeId);
  const showErrorPopupForNode = useWorkflowStore((state) => state.showErrorPopupForNode);
  const canvasReloading = useWorkflowStore((state) => state.canvasReloading);
  const theme = useSettingsStore((state) => state.appearance.theme);
  const fontSize = useSettingsStore((state) => state.appearance.fontSize);
  const fontFamily = useSettingsStore((state) => state.appearance.fontFamily);
  const highContrast = useSettingsStore((state) => state.appearance.highContrast);
  
  // State for browser installation error popup
  const [browserInstallError, setBrowserInstallError] = useState<{ nodeId: string; browserName: string } | null>(null);
  
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
      <div className="flex flex-col h-screen bg-gray-900 text-gray-100 relative">
        {/* Global loader overlay */}
        {canvasReloading && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-200 text-sm">Updating canvas...</p>
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
        <TopBar />
        <FloatingRunButton />
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <Canvas />
          {selectedNode && <RightSidebar />}
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default App;

