import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWorkflowStore } from '../store/workflowStore';
import { serializeWorkflow } from '../utils/serialization';
import { ExecutionEventType } from '@automflows/shared';
import { getCachedBackendPort } from '../utils/getBackendPort';

let socket: Socket | null = null;
let backendPort: number | null = null;

async function getBackendPortSync(): Promise<number> {
  if (backendPort) {
    return backendPort;
  }
  
  // Try to get port from port file endpoint (via proxy)
  try {
    const response = await fetch('/.automflows-port');
    if (response.ok) {
      const portText = await response.text();
      const port = parseInt(portText.trim(), 10);
      if (!isNaN(port) && port > 0) {
        backendPort = port;
        return backendPort;
      }
    }
  } catch (error) {
    // Ignore errors, will retry
  }
  
  // Fallback to environment variable or default
  const fallbackPort = import.meta.env.VITE_BACKEND_PORT 
    ? parseInt(import.meta.env.VITE_BACKEND_PORT, 10)
    : 3003;
  
  backendPort = fallbackPort;
  return backendPort;
}

export function useExecution() {
  const { nodes, edges, setExecutionStatus, setExecutingNodeId, resetExecution } = useWorkflowStore();
  const [port, setPort] = useState<number | null>(null);

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
          break;
        case ExecutionEventType.EXECUTION_COMPLETE:
          setExecutionStatus('completed');
          setExecutingNodeId(null);
          setTimeout(() => {
            resetExecution();
          }, 2000);
          break;
        case ExecutionEventType.EXECUTION_ERROR:
          setExecutionStatus('error');
          setExecutingNodeId(null);
          setTimeout(() => {
            resetExecution();
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
  }, [setExecutionStatus, setExecutingNodeId, resetExecution]);

  const executeWorkflow = async (traceLogs: boolean = false) => {
    try {
      const workflow = serializeWorkflow(nodes, edges);

      // Ensure there's a Start node
      const hasStartNode = nodes.some((node) => node.data.type === 'start');
      if (!hasStartNode) {
        alert('Workflow must contain a Start node');
        return;
      }

      const currentPort = port || await getBackendPortSync();
      const response = await fetch(`http://localhost:${currentPort}/api/workflows/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow, traceLogs }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute workflow');
      }

      const result = await response.json();
      console.log('Execution started:', result);
    } catch (error: any) {
      console.error('Execution error:', error);
      alert('Failed to execute workflow: ' + error.message);
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
  };
}

