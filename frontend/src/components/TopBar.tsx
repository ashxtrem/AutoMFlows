import { useState, useEffect } from 'react';
import { Play, Square, Save, Upload, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { useExecution } from '../hooks/useExecution';
import { useReactFlow } from 'reactflow';
import { serializeWorkflow, deserializeWorkflow } from '../utils/serialization';

const STORAGE_KEY_TRACE_LOGS = 'automflows_trace_logs';

export default function TopBar() {
  const { nodes, edges, setNodes, setEdges, executionStatus, resetExecution } = useWorkflowStore();
  const { executeWorkflow, stopExecution } = useExecution();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  
  // Load trace logs state from localStorage on mount
  const [traceLogs, setTraceLogs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TRACE_LOGS);
    return saved === 'true';
  });

  // Save trace logs state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TRACE_LOGS, String(traceLogs));
  }, [traceLogs]);

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

  const handleLoad = () => {
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
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-white">AutoMFlows</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRun}
          disabled={executionStatus === 'running'}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2 text-sm font-medium"
        >
          <Play size={16} />
          Run
        </button>
        <button
          onClick={handleStop}
          disabled={executionStatus !== 'running'}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2 text-sm font-medium"
        >
          <Square size={16} />
          Stop
        </button>
        <div className="w-px h-6 bg-gray-700 mx-2" />
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
        >
          <Save size={16} />
          Save
        </button>
        <button
          onClick={handleLoad}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 text-sm"
        >
          <Upload size={16} />
          Load
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
        <div className="w-px h-6 bg-gray-700 mx-2" />
        <button
          onClick={() => zoomIn()}
          className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => fitView()}
          className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded"
          title="Fit View"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}

