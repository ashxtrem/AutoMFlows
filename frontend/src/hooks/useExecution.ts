import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWorkflowStore } from '../store/workflowStore';
import { serializeWorkflow } from '../utils/serialization';
import { ExecutionEventType, ScreenshotConfig, ReportConfig } from '@automflows/shared';
import { validateInputConnections, ValidationError } from '../utils/validation';
import { useNotificationStore } from '../store/notificationStore';
import { Node } from 'reactflow';

let socket: Socket | null = null;
let backendPort: number | null = null;

/**
 * Parse backend validation error messages to extract node IDs and create ValidationError objects
 * Backend errors are formatted like: "Workflow validation failed: Node <nodeId> has multiple control flow input connections..."
 * Multiple errors may be joined with commas
 */
function parseBackendValidationErrors(errorMessage: string, nodes: Node[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Remove "Workflow validation failed: " prefix if present
  let cleanMessage = errorMessage.replace(/^Workflow validation failed:\s*/i, '');
  
  // Split by comma to handle multiple errors, but be careful not to split within quoted strings
  // Simple approach: split by ", " (comma followed by space) which is how backend joins errors
  const errorParts = cleanMessage.split(/,\s*(?=Node\s+)/i);
  
  // Pattern to match "Node <nodeId> has..." or "Node <nodeId> must..." etc.
  const nodeErrorPattern = /Node\s+([^\s]+)\s+(has|must|references|does not have|must specify|references non-existent)/i;
  
  for (const errorPart of errorParts) {
    const match = errorPart.match(nodeErrorPattern);
    if (match) {
      const nodeId = match[1];
      const node = nodes.find(n => n.id === nodeId);
      const nodeName = node?.data?.label || nodeId;
      
      // Use the full error part as the message
      const fullMessage = errorPart.trim();
      
      errors.push({
        nodeId,
        nodeName,
        propertyName: 'validation', // Backend validation errors don't have specific property names
        propertyLabel: 'Validation',
        message: fullMessage,
      });
    }
  }
  
  return errors;
}

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
  const { nodes, edges, setExecutionStatus, setExecutingNodeId, resetExecution, setNodeError, clearAllNodeErrors, setValidationErrors: setStoreValidationErrors, clearValidationErrors } = useWorkflowStore();
  const [port, setPort] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const executionStartTimeRef = useRef<number | null>(null);

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
          executionStartTimeRef.current = Date.now();
          addNotification({
            type: 'info',
            title: 'Execution Started',
            message: 'Workflow execution has begun',
          });
          break;
        case ExecutionEventType.NODE_START:
          setExecutingNodeId(event.nodeId);
          break;
        case ExecutionEventType.NODE_COMPLETE:
          setExecutingNodeId(null);
          break;
        case ExecutionEventType.NODE_ERROR:
          setExecutingNodeId(null);
          // Store node error with trace logs and debug info
          if (event.nodeId) {
            setNodeError(event.nodeId, {
              message: event.message || 'Unknown error',
              traceLogs: event.traceLogs || [],
              debugInfo: event.debugInfo,
            });
          }
          // Only stop execution if failSilently is not enabled
          if (!event.failSilently) {
            setExecutionStatus('error');
          }
          // If failSilently is enabled, execution continues, so don't change status
          break;
        case ExecutionEventType.EXECUTION_COMPLETE:
          setExecutionStatus('completed');
          setExecutingNodeId(null);
          // Check if there were any failures - get current state from store
          setTimeout(() => {
            const currentFailedNodes = useWorkflowStore.getState().failedNodes;
            const hasFailures = currentFailedNodes.size > 0;
            if (!hasFailures) {
              const duration = executionStartTimeRef.current 
                ? ((Date.now() - executionStartTimeRef.current) / 1000).toFixed(1)
                : null;
              addNotification({
                type: 'success',
                title: 'Execution Completed',
                message: duration ? `Workflow executed successfully in ${duration}s` : 'Workflow executed successfully with no failures',
              });
            } else {
              addNotification({
                type: 'error',
                title: 'Execution Completed with Errors',
                message: `${currentFailedNodes.size} node(s) failed during execution`,
              });
            }
          }, 100); // Small delay to ensure all node errors are recorded
          executionStartTimeRef.current = null;
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
          
          // Check if this is a backend validation error and parse it
          if (event.message && event.message.includes('Workflow validation failed')) {
            const backendValidationErrors = parseBackendValidationErrors(event.message, nodes);
            if (backendValidationErrors.length > 0) {
              setValidationErrors(backendValidationErrors);
              setStoreValidationErrors(backendValidationErrors);
            }
          }
          
          addNotification({
            type: 'error',
            title: 'Execution Failed',
            message: event.message || 'Workflow execution encountered an error',
          });
          executionStartTimeRef.current = null;
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
  }, [setExecutionStatus, setExecutingNodeId, resetExecution, setNodeError, clearAllNodeErrors, addNotification]);

  const executeWorkflow = async (traceLogs: boolean = false) => {
    try {
      // Validate input connections before execution
      const errors = validateInputConnections(nodes, edges);
      if (errors.length > 0) {
        setValidationErrors(errors);
        setStoreValidationErrors(errors); // Sync to store for node highlighting
        return; // Don't execute if there are validation errors
      }
      setValidationErrors([]);
      clearValidationErrors(); // Clear validation errors from store when validation passes

      const workflow = serializeWorkflow(nodes, edges);

      // Find Start node and extract configuration
      const startNode = nodes.find((node) => node.data.type === 'start');
      if (!startNode) {
        alert('Workflow must contain a Start node');
        return;
      }

      // Extract settings from Start node data
      const startNodeData = startNode.data as any;
      const screenshotAllNodes = startNodeData.screenshotAllNodes || false;
      const screenshotTiming = startNodeData.screenshotTiming || 'post';
      const recordSession = startNodeData.recordSession || false;

      // Read report config from localStorage (still global)
      const reportingEnabled = localStorage.getItem('automflows_reporting_enabled') === 'true';
      const reportPath = localStorage.getItem('automflows_report_path') || './output';
      const reportTypes = JSON.parse(localStorage.getItem('automflows_report_types') || '["html"]');

      const screenshotConfig: ScreenshotConfig | undefined = screenshotAllNodes
        ? { enabled: true, timing: screenshotTiming }
        : undefined;

      const reportConfig: ReportConfig | undefined = reportingEnabled
        ? { enabled: true, outputPath: reportPath, reportTypes }
        : undefined;

      const currentPort = port || await getBackendPortSync();
      const fetchController = new AbortController();
      const fetchTimeoutId = setTimeout(() => fetchController.abort(), 10000); // 10 second timeout for API call
      
      const response = await fetch(`http://localhost:${currentPort}/api/workflows/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          workflow, 
          traceLogs,
          screenshotConfig,
          reportConfig,
          recordSession,
        }),
        signal: fetchController.signal,
      });
      clearTimeout(fetchTimeoutId);

      if (!response.ok) {
        const error = await response.json();
        
        // Parse backend validation errors to extract node IDs
        const backendValidationErrors = parseBackendValidationErrors(error.message || '', nodes);
        if (backendValidationErrors.length > 0) {
          setValidationErrors(backendValidationErrors);
          setStoreValidationErrors(backendValidationErrors);
        }
        
        throw new Error(error.message || 'Failed to execute workflow');
      }

      const result = await response.json();
      console.log('Execution started:', result);
      // Notification for execution start is handled by socket event
    } catch (error: any) {
      console.error('Execution error:', error);
      
      // Check if this is a backend validation error and parse it
      if (error.message && error.message.includes('Workflow validation failed')) {
        const backendValidationErrors = parseBackendValidationErrors(error.message, nodes);
        if (backendValidationErrors.length > 0) {
          setValidationErrors(backendValidationErrors);
          setStoreValidationErrors(backendValidationErrors);
        }
      }
      
      let errorMessage = 'Failed to execute workflow: ' + error.message;
      if (error.name === 'AbortError') {
        const currentPort = port || await getBackendPortSync();
        errorMessage = `Backend server is not responding on port ${currentPort}. Please ensure the backend server is running.`;
      } else if (error.message === 'Failed to fetch') {
        const currentPort = port || await getBackendPortSync();
        errorMessage = `Cannot connect to backend server on port ${currentPort}. Please ensure the backend server is running.`;
      }
      
      addNotification({
        type: 'error',
        title: 'Execution Failed',
        message: errorMessage,
      });
      setExecutionStatus('error');
      executionStartTimeRef.current = null;
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

