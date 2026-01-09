import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWorkflowStore } from '../store/workflowStore';
import { serializeWorkflow } from '../utils/serialization';
import { ExecutionEventType } from '@automflows/shared';
import { validateInputConnections } from '../utils/validation';

let socket: Socket | null = null;
let backendPort: number | null = null;

async function getBackendPortSync(): Promise<number> {
  if (backendPort) {
    return backendPort;
  }
  
  // Try to get port from port file endpoint (via proxy) with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch('/.automflows-port', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const portText = await response.text();
      const port = parseInt(portText.trim(), 10);
      if (!isNaN(port) && port > 0) {
        backendPort = port;
        return backendPort;
      }
    }
  } catch (error: any) {
    // Ignore errors, will use fallback
  }
  
  // Fallback to environment variable or default
  // Try common ports if port discovery fails
  const fallbackPort = import.meta.env.VITE_BACKEND_PORT 
    ? parseInt(import.meta.env.VITE_BACKEND_PORT, 10)
    : 3004; // Default to 3004 since backend typically starts there
  backendPort = fallbackPort;
  return backendPort;
}

export function useExecution() {
  const { nodes, edges, setExecutionStatus, setExecutingNodeId, resetExecution, setNodeError, clearAllNodeErrors } = useWorkflowStore();
  const [port, setPort] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    
    // Get backend port
    getBackendPortSync().then((p) => {
      if (!mounted) return;
      setPort(p);
      
      // Initialize socket connection
      socket = io(`http://localhost:${p}`, {
        transports: ['websocket'],
      });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('execution-event', (event: any) => {
      console.log('Execution event:', event);

      switch (event.type) {
        case ExecutionEventType.EXECUTION_START:
          setExecutionStatus('running');
          clearAllNodeErrors(); // Clear previous errors when starting new execution
          break;
        case ExecutionEventType.NODE_START:
          setExecutingNodeId(event.nodeId);
          break;
        case ExecutionEventType.NODE_COMPLETE:
          setExecutingNodeId(null);
          break;
        case ExecutionEventType.NODE_ERROR:
          setExecutingNodeId(null);
          setExecutionStatus('error');
          // Store node error with trace logs and debug info
          if (event.nodeId) {
            setNodeError(event.nodeId, {
              message: event.message || 'Unknown error',
              traceLogs: event.traceLogs || [],
              debugInfo: event.debugInfo,
            });
          }
          break;
        case ExecutionEventType.EXECUTION_COMPLETE:
          setExecutionStatus('completed');
          setExecutingNodeId(null);
          // Don't clear failedNodes here - let user see errors until they dismiss or start new execution
          setTimeout(() => {
            // Only reset execution status, keep failed nodes visible
            setExecutionStatus('idle');
            setExecutingNodeId(null);
          }, 2000);
          break;
        case ExecutionEventType.EXECUTION_ERROR:
          setExecutionStatus('error');
          setExecutingNodeId(null);
          // Don't clear failedNodes here - let user see errors until they dismiss or start new execution
          setTimeout(() => {
            // Only reset execution status, keep failed nodes visible
            setExecutionStatus('idle');
            setExecutingNodeId(null);
          }, 2000);
          break;
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

      return () => {
        if (socket) {
          socket.disconnect();
          socket = null;
        }
      };
    });

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [setExecutionStatus, setExecutingNodeId, resetExecution, setNodeError, clearAllNodeErrors]);

  const executeWorkflow = async (traceLogs: boolean = false) => {
    try {
      // Validate input connections before execution
      const errors = validateInputConnections(nodes, edges);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return; // Don't execute if there are validation errors
      }
      setValidationErrors([]);

      const workflow = serializeWorkflow(nodes, edges);

      // Ensure there's a Start node
      const hasStartNode = nodes.some((node) => node.data.type === 'start');
      if (!hasStartNode) {
        alert('Workflow must contain a Start node');
        return;
      }

      const currentPort = port || await getBackendPortSync();
      const fetchController = new AbortController();
      const fetchTimeoutId = setTimeout(() => fetchController.abort(), 10000); // 10 second timeout for API call
      
      const response = await fetch(`http://localhost:${currentPort}/api/workflows/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow, traceLogs }),
        signal: fetchController.signal,
      });
      clearTimeout(fetchTimeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute workflow');
      }

      const result = await response.json();
      console.log('Execution started:', result);
    } catch (error: any) {
      console.error('Execution error:', error);
      
      let errorMessage = 'Failed to execute workflow: ' + error.message;
      if (error.name === 'AbortError') {
        const currentPort = port || await getBackendPortSync();
        errorMessage = `Backend server is not responding on port ${currentPort}. Please ensure the backend server is running.`;
      } else if (error.message === 'Failed to fetch') {
        const currentPort = port || await getBackendPortSync();
        errorMessage = `Cannot connect to backend server on port ${currentPort}. Please ensure the backend server is running.`;
      }
      
      alert(errorMessage);
      setExecutionStatus('error');
    }
  };

  const stopExecution = async () => {
    try {
      const currentPort = port || await getBackendPortSync();
      const response = await fetch(`http://localhost:${currentPort}/api/workflows/execution/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop execution');
      }
    } catch (error: any) {
      console.error('Stop execution error:', error);
      alert('Failed to stop execution: ' + error.message);
    }
  };

  return {
    executeWorkflow,
    stopExecution,
    validationErrors,
    setValidationErrors,
  };
}

