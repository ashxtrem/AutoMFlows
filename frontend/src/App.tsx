import { useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import TopBar from './components/TopBar';
import LeftSidebar from './components/LeftSidebar';
import Canvas from './components/Canvas';
import RightSidebar from './components/RightSidebar';
import { useWorkflowStore } from './store/workflowStore';
import NodeErrorPopup from './components/NodeErrorPopup';
import { useWorkflowAutoSave, useWorkflowLoad } from './hooks/useWorkflow';
import { useUndoRedo } from './hooks/useUndoRedo';
import { loadPlugins } from './plugins/loader';
import { getBackendPort } from './utils/getBackendPort';

function App() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const failedNodes = useWorkflowStore((state) => state.failedNodes);
  const errorPopupNodeId = useWorkflowStore((state) => state.errorPopupNodeId);
  const showErrorPopupForNode = useWorkflowStore((state) => state.showErrorPopupForNode);
  
  // Auto-save and load workflow
  useWorkflowAutoSave();
  useWorkflowLoad();
  
  // Undo/Redo keyboard shortcuts
  useUndoRedo();

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
    if (failedNodes.size > 0 && !errorPopupNodeId && hasNewFailedNode) {
      // Find first failed node that hasn't been dismissed
      const firstFailedNodeId = Array.from(failedNodes.keys()).find(
        nodeId => !dismissedPopupRef.current.has(nodeId)
      );
      
      if (firstFailedNodeId) {
        showErrorPopupForNode(firstFailedNodeId);
      }
    }
    // Update ref to track previous state
    prevFailedNodesRef.current = new Map(failedNodes);
    // Don't auto-close popup when failedNodes becomes empty - let user dismiss it manually
  }, [failedNodes, errorPopupNodeId, showErrorPopupForNode]);

  const handleCloseErrorPopup = useCallback(() => {
    if (errorPopupNodeId) {
      // Mark this node's popup as dismissed to prevent auto-reopening
      dismissedPopupRef.current.add(errorPopupNodeId);
    }
    showErrorPopupForNode(null);
  }, [showErrorPopupForNode, errorPopupNodeId]);

  const errorPopupError = errorPopupNodeId ? failedNodes.get(errorPopupNodeId) : null;

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
        {errorPopupNodeId && errorPopupError && (
          <NodeErrorPopup
            nodeId={errorPopupNodeId}
            error={errorPopupError}
            onClose={handleCloseErrorPopup}
          />
        )}
        <TopBar />
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

