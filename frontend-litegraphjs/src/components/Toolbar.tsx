import { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { executeWorkflow, stopExecution, getExecutionStatus, initializeSocket, getSocket } from '../services/workflowService';
import { validateWorkflow } from '../utils/workflowValidator';
import { ExecutionStatus } from '@automflows/shared';

export default function Toolbar() {
  const { 
    graph, 
    getWorkflow, 
    executionStatus, 
    setExecutionStatus, 
    setExecutionId, 
    setExecutingNodeId,
    setError,
    resetExecution,
    saveToLocalStorage,
    loadFromLocalStorage,
  } = useWorkflowStore();

  const [isExecuting, setIsExecuting] = useState(false);

  const handleSave = () => {
    saveToLocalStorage();
    alert('Workflow saved to localStorage');
  };

  const handleLoad = () => {
    loadFromLocalStorage();
    alert('Workflow loaded from localStorage');
  };

  const handleExecute = async () => {
    if (!graph) {
      alert('No graph to execute');
      return;
    }

    const workflow = getWorkflow();
    if (!workflow) {
      alert('Failed to convert graph to workflow');
      return;
    }

    // Validate workflow
    const errors = validateWorkflow(workflow);
    if (errors.length > 0) {
      alert(`Workflow validation failed:\n${errors.map(e => e.message).join('\n')}`);
      return;
    }

    try {
      setIsExecuting(true);
      setExecutionStatus(ExecutionStatus.RUNNING);
      setError(null);

      // Initialize socket connection
      await initializeSocket();
      const socket = getSocket();

      // Set up socket listeners
      if (socket) {
        socket.on('execution_event', (event: any) => {
          if (event.type === 'node_start') {
            setExecutingNodeId(event.nodeId || null);
          } else if (event.type === 'node_complete') {
            if (event.nodeId === useWorkflowStore.getState().executingNodeId) {
              setExecutingNodeId(null);
            }
          } else if (event.type === 'execution_complete') {
            setExecutionStatus(ExecutionStatus.COMPLETED);
            setIsExecuting(false);
          } else if (event.type === 'execution_error' || event.type === 'node_error') {
            setExecutionStatus(ExecutionStatus.ERROR);
            setError(event.message || 'Execution error');
            setIsExecuting(false);
          }
        });
      }

      // Execute workflow
      const result = await executeWorkflow(workflow, false);
      setExecutionId(result.executionId);

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const status = await getExecutionStatus();
          setExecutionStatus(status.status as ExecutionStatus);
          setExecutingNodeId(status.currentNodeId || null);
          
          if (status.status === ExecutionStatus.COMPLETED || status.status === ExecutionStatus.ERROR) {
            clearInterval(pollInterval);
            setIsExecuting(false);
            if (status.error) {
              setError(status.error);
            }
          }
        } catch (error) {
          console.error('Failed to get execution status:', error);
        }
      }, 500);

      // Cleanup interval after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);

    } catch (error: any) {
      setExecutionStatus(ExecutionStatus.ERROR);
      setError(error.message || 'Failed to execute workflow');
      setIsExecuting(false);
      alert(`Execution failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleStop = async () => {
    try {
      await stopExecution();
      resetExecution();
      setIsExecuting(false);
    } catch (error: any) {
      alert(`Failed to stop execution: ${error.message}`);
    }
  };

  const getStatusColor = () => {
    switch (executionStatus) {
      case ExecutionStatus.RUNNING:
        return '#4CAF50';
      case ExecutionStatus.ERROR:
        return '#F44336';
      case ExecutionStatus.COMPLETED:
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  return (
    <div className="toolbar" style={{
      height: '48px',
      backgroundColor: '#1e1e1e',
      borderBottom: '1px solid #404040',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '8px',
    }}>
      <button
        onClick={handleSave}
        disabled={!graph}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3d3d3d',
          border: '1px solid #404040',
          borderRadius: '4px',
          color: '#ffffff',
          cursor: graph ? 'pointer' : 'not-allowed',
          fontSize: '14px',
        }}
      >
        Save
      </button>

      <button
        onClick={handleLoad}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3d3d3d',
          border: '1px solid #404040',
          borderRadius: '4px',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Load
      </button>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#404040', margin: '0 8px' }} />

      {executionStatus === ExecutionStatus.RUNNING ? (
        <button
          onClick={handleStop}
          style={{
            padding: '8px 16px',
            backgroundColor: '#F44336',
            border: 'none',
            borderRadius: '4px',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleExecute}
          disabled={!graph || isExecuting}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            border: 'none',
            borderRadius: '4px',
            color: '#ffffff',
            cursor: graph && !isExecuting ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          Execute
        </button>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
          }}
        />
        <span style={{ fontSize: '12px', color: '#999999' }}>
          {executionStatus}
        </span>
      </div>
    </div>
  );
}
