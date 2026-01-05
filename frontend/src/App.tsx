import { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import TopBar from './components/TopBar';
import LeftSidebar from './components/LeftSidebar';
import Canvas from './components/Canvas';
import RightSidebar from './components/RightSidebar';
import { useWorkflowStore } from './store/workflowStore';
import SecurityWarning from './components/SecurityWarning';
import { useWorkflowAutoSave, useWorkflowLoad } from './hooks/useWorkflow';
import { useUndoRedo } from './hooks/useUndoRedo';
import { loadPlugins } from './plugins/loader';
import { getBackendPort } from './utils/getBackendPort';

function App() {
  const [showWarning, setShowWarning] = useState(true);
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  
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

  const handleDismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
        {showWarning && <SecurityWarning onDismiss={handleDismissWarning} />}
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

