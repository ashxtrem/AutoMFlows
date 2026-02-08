import { useState, useEffect, useRef, useCallback } from 'react';
import { RecordedAction } from '@automflows/shared';
import {
  initActionRecorder,
  startActionRecording,
  stopActionRecording,
  onActionRecorded,
  onRecordingStateChange,
  resetActions,
  getRecordedActions,
} from '../services/actionRecorder';
import { useWorkflowStore } from '../store/workflowStore';
import { useNotificationStore } from '../store/notificationStore';

async function getBackendPort(): Promise<number> {
  try {
    const response = await fetch('/.automflows-port');
    if (response.ok) {
      const portText = await response.text();
      const port = parseInt(portText.trim(), 10);
      if (!isNaN(port) && port > 0) {
        return port;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return parseInt(import.meta.env.VITE_BACKEND_PORT || '3001', 10);
}

export function useBuilderMode() {
  const {
    builderModeActions,
    builderModeModalMinimized,
    builderModeActive,
    setBuilderModeActions,
    addBuilderModeAction,
    updateBuilderModeAction,
    markActionAsInserted,
    setBuilderModeModalMinimized,
    resetBuilderModeActions,
  } = useWorkflowStore();
  
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [isRecording, setIsRecording] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [backendPort, setBackendPort] = useState<number | null>(null);
  
  // Show modal when builder mode becomes active
  useEffect(() => {
    if (builderModeActive) {
      if (builderModeModalMinimized) {
        // If minimized, just show minimized icon (handled by App.tsx)
        setShowModal(false);
      } else {
        setShowModal(true);
      }
    }
  }, [builderModeActive, builderModeModalMinimized]);
  const actionRecordedCleanupRef = useRef<(() => void) | null>(null);
  const recordingStateCleanupRef = useRef<(() => void) | null>(null);
  const actionHistoryRef = useRef<RecordedAction[][]>([]); // For undo/redo
  const historyIndexRef = useRef<number>(-1);

  // Initialize backend port and action recorder
  useEffect(() => {
    getBackendPort().then((port) => {
      setBackendPort(port);
      initActionRecorder(port);
    });
  }, []);

  // Register callbacks for action recording
  useEffect(() => {
    if (!backendPort) return;

    // Clean up previous callbacks
    if (actionRecordedCleanupRef.current) {
      actionRecordedCleanupRef.current();
    }
    if (recordingStateCleanupRef.current) {
      recordingStateCleanupRef.current();
    }

    // Register action recorded callback
    const actionCleanup = onActionRecorded('builder-mode', (action: RecordedAction) => {
      addBuilderModeAction(action);
      // Update history for undo/redo
      const currentActions = useWorkflowStore.getState().builderModeActions;
      actionHistoryRef.current = actionHistoryRef.current.slice(0, historyIndexRef.current + 1);
      actionHistoryRef.current.push([...currentActions]);
      historyIndexRef.current = actionHistoryRef.current.length - 1;
    });

    // Register recording state callback
    const stateCleanup = onRecordingStateChange('builder-mode', (recording: boolean) => {
      setIsRecording(recording);
    });

    actionRecordedCleanupRef.current = actionCleanup;
    recordingStateCleanupRef.current = stateCleanup;

    return () => {
      if (actionRecordedCleanupRef.current) {
        actionRecordedCleanupRef.current();
      }
      if (recordingStateCleanupRef.current) {
        recordingStateCleanupRef.current();
      }
    };
  }, [backendPort, addBuilderModeAction]);

  // Load persisted actions on mount
  useEffect(() => {
    if (backendPort && builderModeActions.length === 0) {
      // Actions are already loaded from localStorage in store
      // But we can also fetch from backend if needed
      getRecordedActions(backendPort).then((actions) => {
        if (actions.length > 0) {
          setBuilderModeActions(actions);
        }
      }).catch(() => {
        // Ignore errors - use localStorage actions
      });
    }
  }, [backendPort, builderModeActions.length, setBuilderModeActions]);

  const startRecording = useCallback(async () => {
    if (!backendPort) return;
    try {
      // Show warning notification about overlay visibility
      addNotification({
        type: 'info',
        title: 'Recording Started',
        message: 'If the overlay button is not visible, click the device toggle to re-render the viewport and the overlay will appear.',
        duration: 8000, // Show for 8 seconds
      });

      // Call backend to inject overlay (switch to browser and inject)
      const response = await fetch(`http://localhost:${backendPort}/api/workflows/builder-mode/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start builder mode');
      }

      // Start recording after overlay is injected
      await startActionRecording(backendPort);
      setIsRecording(true);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Start Recording',
        message: error.message || 'Failed to start action recording',
      });
    }
  }, [backendPort, addNotification]);

  const stopRecording = useCallback(async () => {
    if (!backendPort) return;
    try {
      await stopActionRecording(backendPort);
      setIsRecording(false);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Stop Recording',
        message: error.message || 'Failed to stop action recording',
      });
    }
  }, [backendPort, addNotification]);

  const handleInsertAction = useCallback((actionId: string) => {
    const action = builderModeActions.find(a => a.id === actionId);
    if (!action) return;

    // Import node type detector
    import('../utils/nodeTypeDetector').then(({ detectNodeType, getDefaultNodeDataFromAction }) => {
      const { addNode, updateNodeData } = useWorkflowStore.getState();
      const { nodes, edges } = useWorkflowStore.getState();
      
      // Detect node type
      const nodeType = action.customNodeType || detectNodeType(action);
      const nodeData = getDefaultNodeDataFromAction(action, nodeType);
      
      // Find last node
      const nodesWithOutputs = new Set(edges.map((e) => e.source));
      const lastNode = nodes
        .filter((node) => !nodesWithOutputs.has(node.id))
        .slice(-1)[0];
      
      // Calculate position
      const position = lastNode
        ? { x: lastNode.position.x + 300, y: lastNode.position.y }
        : { x: 100, y: 100 };
      
      // Add node
      addNode(nodeType, position);
      
      // Get the newly added node and update its data with action values
      setTimeout(() => {
        const { nodes: newNodes } = useWorkflowStore.getState();
        const newNode = newNodes[newNodes.length - 1];
        
        if (!newNode) return;
        
        // Update node data with action values (selector, text, etc.)
        updateNodeData(newNode.id, nodeData);
        
        // Create edge if there's a last node
        if (lastNode) {
          const { setEdges, edges: currentEdges } = useWorkflowStore.getState();
          // Check if edge already exists (might be auto-created by addNode)
          const edgeExists = currentEdges.some(
            e => e.source === lastNode.id && e.target === newNode.id
          );
          if (!edgeExists) {
            const newEdge = {
              id: `edge-${lastNode.id}-output-${newNode.id}-input`,
              source: lastNode.id,
              target: newNode.id,
              sourceHandle: 'output',
              targetHandle: 'input',
            };
            setEdges([...currentEdges, newEdge]);
          }
        }
        
        // Mark action as inserted
        markActionAsInserted(actionId, newNode.id);
      }, 100);
    });
  }, [builderModeActions, markActionAsInserted]);

  const handleEditAction = useCallback((actionId: string, updates: Partial<RecordedAction>) => {
    updateBuilderModeAction(actionId, updates);
    // Update history
    const currentActions = useWorkflowStore.getState().builderModeActions;
    actionHistoryRef.current = actionHistoryRef.current.slice(0, historyIndexRef.current + 1);
    actionHistoryRef.current.push([...currentActions]);
    historyIndexRef.current = actionHistoryRef.current.length - 1;
  }, [updateBuilderModeAction]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const previousActions = actionHistoryRef.current[historyIndexRef.current];
      setBuilderModeActions(previousActions);
    }
  }, [setBuilderModeActions]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < actionHistoryRef.current.length - 1) {
      historyIndexRef.current++;
      const nextActions = actionHistoryRef.current[historyIndexRef.current];
      setBuilderModeActions(nextActions);
    }
  }, [setBuilderModeActions]);

  const handleMinimize = useCallback(() => {
    setBuilderModeModalMinimized(true);
  }, [setBuilderModeModalMinimized]);

  const handleMaximize = useCallback(() => {
    setBuilderModeModalMinimized(false);
    setShowModal(true);
  }, [setBuilderModeModalMinimized]);

  const handleClearActions = useCallback(() => {
    const confirmed = window.confirm('This will clear all recorded actions. This action cannot be undone. Continue?');
    if (confirmed) {
      if (backendPort) {
        resetActions(backendPort).catch(() => {
          // Ignore errors
        });
      }
      resetBuilderModeActions();
      // Reset history
      actionHistoryRef.current = [];
      historyIndexRef.current = -1;
      addNotification({
        type: 'info',
        title: 'Actions Cleared',
        message: 'All recorded actions have been cleared.',
      });
    }
  }, [backendPort, resetBuilderModeActions, addNotification]);

  const handleClose = useCallback(() => {
    const confirmed = window.confirm('Closing will discard all recorded actions. Continue?');
    if (confirmed) {
      setShowModal(false);
      if (backendPort) {
        resetActions(backendPort).catch(() => {
          // Ignore errors
        });
      }
      resetBuilderModeActions();
    }
  }, [backendPort, resetBuilderModeActions]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < actionHistoryRef.current.length - 1;

  const recordedActions = builderModeActions.filter(a => !a.inserted);
  const insertedActions = builderModeActions.filter(a => a.inserted);

  return {
    isRecording,
    showModal,
    setShowModal,
    isMinimized: builderModeModalMinimized,
    recordedActions,
    insertedActions,
    startRecording,
    stopRecording,
    handleInsertAction,
    handleEditAction,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    handleMinimize,
    handleMaximize,
    handleClose,
    handleClearActions,
  };
}
