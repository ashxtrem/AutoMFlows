import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWorkflowStore } from '../store/workflowStore';
import { serializeWorkflow } from '../utils/serialization';
import { ExecutionEventType, ScreenshotConfig, ReportConfig, BreakpointConfig } from '@automflows/shared';
import { validateInputConnections, ValidationError } from '../utils/validation';
import { useNotificationStore } from '../store/notificationStore';
import { useSettingsStore } from '../store/settingsStore';
import { Node } from 'reactflow';
import { hasHeadlessBrowser } from '../utils/workflowChecks';

let socket: Socket | null = null;
let backendPort: number | null = null;
let listenersRegistered: boolean = false; // Track if listeners are already registered

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
  const { 
    nodes, 
    edges, 
    setExecutionStatus, 
    setExecutingNodeId, 
    resetExecution, 
    setNodeError, 
    clearAllNodeErrors, 
    setValidationErrors: setStoreValidationErrors, 
    clearValidationErrors,
    setPausedNode,
    pausedNodeId,
    pauseReason,
    breakpointEnabled,
    breakpointAt,
    breakpointFor,
    builderModeEnabled,
    builderModeActions,
    resetBuilderModeActions,
  } = useWorkflowStore();
  const reportRetention = useSettingsStore((state) => state.reports.reportRetention);
  const [port, setPort] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const executionStartTimeRef = useRef<number | null>(null);
  const [showBreakpointWarning, setShowBreakpointWarning] = useState(false);
  const [pendingExecution, setPendingExecution] = useState<{ traceLogs: boolean; disableBreakpoints: boolean } | null>(null);
  const justContinuedRef = useRef<boolean>(false); // Track if execution just continued to prevent immediate breakpoint re-trigger

  useEffect(() => {
    let mounted = true;
    
    // Get backend port
    getBackendPortSync().then((p) => {
      if (!mounted) return;
      setPort(p);
      
      // Initialize socket connection (only if not already exists and connected)
      if (!socket || !socket.connected) {
        // Disconnect old socket if it exists but not connected
        if (socket) {
          socket.disconnect();
        }
        socket = io(`http://localhost:${p}`, {
          transports: ['websocket'],
        });
        // Reset listenersRegistered when creating new socket so listeners are re-registered
        listenersRegistered = false;
      }

      // Register listeners on current socket (always re-register if socket was recreated)
      if (!listenersRegistered) {
        // Remove any existing listeners to prevent duplicates
        socket.off('connect');
        socket.off('execution-event');
        socket.off('disconnect');

        socket.on('connect', () => {
          console.log('Connected to server');
        });

        socket.on('execution-event', async (event: any) => {
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
        case ExecutionEventType.EXECUTION_PAUSED:
          if (event.nodeId) {
            const reason = event.data?.reason || 'wait-pause';
            setPausedNode(event.nodeId, reason);
            // Only show notification for wait-pause, breakpoint notifications are handled by BREAKPOINT_TRIGGERED
            if (reason === 'wait-pause') {
              addNotification({
                type: 'info',
                title: 'Execution Paused',
                message: `Execution paused at node: ${event.nodeId}`,
              });
            }
          }
          break;
        case ExecutionEventType.BREAKPOINT_TRIGGERED:
          // Ignore BREAKPOINT_TRIGGERED if execution just continued (to prevent buttons from reappearing immediately)
          if (justContinuedRef.current) {
            break;
          }
          
          if (event.nodeId) {
            setPausedNode(event.nodeId, 'breakpoint', event.data?.breakpointAt);
            addNotification({
              type: 'info',
              title: 'Breakpoint Triggered',
              message: `Breakpoint triggered at node: ${event.nodeId}`,
            });
          }
          break;
        case ExecutionEventType.EXECUTION_COMPLETE:
          setExecutionStatus('completed');
          setExecutingNodeId(null);
          setPausedNode(null, null, null); // Clear pause state
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
          
          // Auto-open report if enabled - show notification with button instead of auto-opening
          const autoOpenReports = localStorage.getItem('automflows_settings_reports_autoOpen') === 'true';
          const reportingEnabled = localStorage.getItem('automflows_reporting_enabled') === 'true';
          if (autoOpenReports && reportingEnabled) {
            setTimeout(async () => {
              try {
                const currentPort = port || await getBackendPortSync();
                if (!currentPort) return;
                
                // Fetch latest reports
                const response = await fetch(`http://localhost:${currentPort}/api/reports/list`);
                if (!response.ok) return;
                
                const reports = await response.json();
                if (reports.length === 0) return;
                
                // Get the latest report (first in sorted list)
                const latestReport = reports[0];
                const defaultFormat = localStorage.getItem('automflows_settings_reports_defaultFormat') || 'html';
                
                // Find the report file for the default format
                let reportFile = latestReport.files.find((f: any) => f.type === defaultFormat);
                
                // If default format not found, try HTML
                if (!reportFile) {
                  reportFile = latestReport.files.find((f: any) => f.type === 'html');
                }
                
                if (reportFile) {
                  // Build report URL
                  let reportUrl: string;
                  if (defaultFormat === 'allure') {
                    reportUrl = `http://localhost:${currentPort}/reports/${latestReport.folderName}/allure/index.html`;
                  } else {
                    reportUrl = `http://localhost:${currentPort}/reports/${latestReport.folderName}/${reportFile.type}/${reportFile.name}`;
                  }
                  
                  // Show notification with button to open report
                  addNotification({
                    type: 'success',
                    title: 'Report Generated',
                    message: 'Click the button below to open the report in a new tab.',
                    action: {
                      label: 'Open Report',
                      onClick: () => {
                        window.open(reportUrl, '_blank');
                      },
                    },
                    duration: 10000, // Show for 10 seconds
                  });
                }
              } catch (error) {
                console.warn('Failed to fetch report for auto-open:', error);
              }
            }, 500); // Small delay to ensure report is generated
          }
          
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
          setPausedNode(null, null, null); // Clear pause state
          
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

        listenersRegistered = true;
      }

      return () => {
        // Don't disconnect socket here - it's shared across hook instances
        // Only disconnect in outer cleanup when component unmounts
      };
    });

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
    }, [setExecutionStatus, setExecutingNodeId, resetExecution, setNodeError, clearAllNodeErrors, addNotification, builderModeEnabled, port, nodes, setValidationErrors, setStoreValidationErrors]);

  const executeWorkflowInternal = async (traceLogs: boolean = false, disableBreakpoints: boolean = false) => {
    try {
      // Check if builder mode is enabled and headless browser is detected
      if (builderModeEnabled && hasHeadlessBrowser(nodes)) {
        addNotification({
          type: 'error',
          title: 'Builder Mode Requires Non-Headless Browser',
          message: 'Builder Mode requires a non-headless browser. Please disable headless mode in the Open Browser node.',
        });
        return; // Prevent execution
      }
      
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
        ? { enabled: true, outputPath: reportPath, reportTypes, reportRetention }
        : undefined;

      // Read breakpoint config from store (or disable if requested)
      const breakpointConfig: BreakpointConfig | undefined = (breakpointEnabled && !disableBreakpoints)
        ? { enabled: true, breakpointAt, breakpointFor }
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
          breakpointConfig,
          builderModeEnabled,
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

  const executeWorkflow = async (traceLogs: boolean = false) => {
    // Clear builder mode actions if workflow is being rerun
    const currentBuilderModeActions = useWorkflowStore.getState().builderModeActions;
    if (currentBuilderModeActions && currentBuilderModeActions.length > 0) {
      // Clear builder mode actions
      resetBuilderModeActions();
      
      // Also reset backend actions if port is available
      if (port) {
        try {
          await fetch(`http://localhost:${port}/api/workflows/builder-mode/actions/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => {
            // Ignore errors
          });
        } catch (error) {
          // Ignore errors
        }
      }
    }
    
    // Check if breakpoints are enabled and browser is headless
    if (breakpointEnabled && hasHeadlessBrowser(nodes)) {
      // Check localStorage for global preference (not workflow-specific)
      const preferenceKey = 'automflows_breakpoint_headless_warning_preference';
      const preference = localStorage.getItem(preferenceKey);
      
      // If preference exists, use it
      if (preference === 'continue') {
        await executeWorkflowInternal(traceLogs, false);
        return;
      } else if (preference === 'disable') {
        await executeWorkflowInternal(traceLogs, true);
        return;
      }
      
      // No preference found - show warning dialog
      setPendingExecution({ traceLogs, disableBreakpoints: false });
      setShowBreakpointWarning(true);
      return;
    }
    
    // No warning needed, proceed with execution
    await executeWorkflowInternal(traceLogs, false);
  };

  const handleBreakpointWarningContinue = () => {
    setShowBreakpointWarning(false);
    if (pendingExecution) {
      executeWorkflowInternal(pendingExecution.traceLogs, false);
      setPendingExecution(null);
    }
  };

  const handleBreakpointWarningDisable = () => {
    setShowBreakpointWarning(false);
    if (pendingExecution) {
      executeWorkflowInternal(pendingExecution.traceLogs, true);
      setPendingExecution(null);
    }
  };

  const handleBreakpointWarningCancel = () => {
    setShowBreakpointWarning(false);
    setPendingExecution(null);
  };


  const handleBreakpointWarningDontAskAgain = (choice: 'continue' | 'disable') => {
    // Store global preference (not workflow-specific)
    const preferenceKey = 'automflows_breakpoint_headless_warning_preference';
    localStorage.setItem(preferenceKey, choice);
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
      setPausedNode(null, null); // Clear pause state
    } catch (error: any) {
      console.error('Stop execution error:', error);
      alert('Failed to stop execution: ' + error.message);
    }
  };

  const continueExecution = async () => {
    try {
      const currentPort = port || await getBackendPortSync();
      const response = await fetch(`http://localhost:${currentPort}/api/workflows/execution/continue`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to continue execution');
      }
      setPausedNode(null, null); // Clear pause state
    } catch (error: any) {
      console.error('Continue execution error:', error);
      alert('Failed to continue execution: ' + error.message);
    }
  };

  const updateWorkflowDuringExecution = async (workflow: any) => {
    try {
      const currentPort = port || await getBackendPortSync();
      const response = await fetch(`http://localhost:${currentPort}/api/workflows/execution/update-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update workflow');
      }

      const result = await response.json();
      console.log('Workflow updated during execution:', result);

      return result;
    } catch (error: any) {
      // Don't show error notification if execution resumed (this is expected behavior)
      // The error "Execution is not paused" means execution resumed between check and API call
      const errorMessage = error?.message || '';
      const isExecutionResumedError = errorMessage.includes('Execution is not paused') || 
                                     errorMessage.includes('not paused');
      
      if (!isExecutionResumedError) {
        console.error('Update workflow error:', error);
        addNotification({
          type: 'error',
          title: 'Update Failed',
          message: errorMessage || 'Failed to update workflow during execution',
        });
      } else {
        // Silently ignore - execution resumed, which is expected
      }
      throw error;
    }
  };

  const pauseControl = async (action: 'continue' | 'stop' | 'skip' | 'continueWithoutBreakpoint') => {
    // Check if execution is paused (not if it's running - when paused, status is still 'running')
    const isCurrentlyPaused = useWorkflowStore.getState().pausedNodeId !== null;
    
    if (!isCurrentlyPaused) {
      addNotification({
        type: 'error',
        title: 'Action Not Available',
        message: 'Execution is not paused. This action is only available when execution is paused at a breakpoint.',
      });
      return;
    }

    try {
      const currentPort = port || await getBackendPortSync();
      const response = await fetch(`http://localhost:${currentPort}/api/workflows/execution/pause-control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to execute pause control' }));
        const errorMessage = errorData.message || 'Failed to execute pause control';
        
        // Handle "Execution is not paused" error gracefully
        if (errorMessage.includes('Execution is not paused')) {
          addNotification({
            type: 'info',
            title: 'Execution Already Running',
            message: 'Execution has already resumed. The action was not applied.',
          });
          return;
        }
        
        throw new Error(errorMessage);
      }
      
      // Clear pause state for continue actions
      if (action === 'continue' || action === 'skip' || action === 'continueWithoutBreakpoint') {
        setPausedNode(null, null);
        // Set flag to ignore immediate BREAKPOINT_TRIGGERED events
        justContinuedRef.current = true;
        // Clear flag after a short delay to allow execution to actually start
        setTimeout(() => {
          justContinuedRef.current = false;
        }, 500); // 500ms should be enough for execution to start
      }
    } catch (error: any) {
      console.error('Pause control error:', error);
      addNotification({
        type: 'error',
        title: 'Action Failed',
        message: error.message || 'Failed to execute pause control. Please try again.',
      });
    }
  };

  // Auto-sync workflow changes during breakpoint pause (debounced)
  useEffect(() => {
    // Only sync during breakpoint pause, not wait-pause
    if (pauseReason !== 'breakpoint' || !pausedNodeId) {
      return;
    }

    // Debounce workflow sync to avoid too many API calls
    const syncTimeout = setTimeout(async () => {
      // CRITICAL FIX: Check pause state again before making API call
      // Execution may have resumed between timeout setup and execution
      const currentPauseReason = useWorkflowStore.getState().pauseReason;
      const currentPausedNodeId = useWorkflowStore.getState().pausedNodeId;
      
      if (currentPauseReason !== 'breakpoint' || !currentPausedNodeId) {
        return; // Execution resumed, don't update
      }
      
      try {
        const workflow = serializeWorkflow(nodes, edges);
        await updateWorkflowDuringExecution(workflow);
      } catch (error) {
        // Error handling is done in updateWorkflowDuringExecution
        // It will suppress notifications for "Execution is not paused" errors
      }
    }, 1000); // 1 second debounce

    return () => {
      clearTimeout(syncTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, pauseReason, pausedNodeId]); // Only sync when nodes/edges change during breakpoint pause

  return {
    executeWorkflow,
    stopExecution,
    continueExecution,
    pauseControl,
    updateWorkflowDuringExecution,
    validationErrors,
    setValidationErrors,
    showBreakpointWarning,
    handleBreakpointWarningContinue,
    handleBreakpointWarningDisable,
    handleBreakpointWarningCancel,
    handleBreakpointWarningDontAskAgain,
  };
}

