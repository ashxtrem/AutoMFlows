import { RecordedAction, BuilderModeEvent } from '@automflows/shared';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let actionRecordedCallbacks: Map<string, (action: RecordedAction) => void> = new Map();
let actionsRecordedCallbacks: Map<string, (actions: RecordedAction[]) => void> = new Map();
let recordingStateCallbacks: Map<string, (isRecording: boolean) => void> = new Map();

/**
 * Initialize action recorder service
 */
export function initActionRecorder(backendPort: number): void {
  if (socket && socket.connected) {
    return; // Already initialized
  }

  socket = io(`http://localhost:${backendPort}`, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Action recorder socket connected');
  });

  socket.on('builder-mode-event', (event: BuilderModeEvent) => {
    if (event.event === 'action-recorded' && event.action) {
      // Notify all registered callbacks
      actionRecordedCallbacks.forEach((callback) => {
        callback(event.action!);
      });
    } else if (event.event === 'recording-started') {
      // Notify all recording state callbacks
      recordingStateCallbacks.forEach((callback) => {
        callback(true);
      });
    } else if (event.event === 'recording-stopped') {
      // Notify all recording state callbacks
      recordingStateCallbacks.forEach((callback) => {
        callback(false);
      });
    } else if (event.event === 'actions-reset') {
      // Notify all actions callbacks
      actionsRecordedCallbacks.forEach((callback) => {
        callback([]);
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Action recorder socket disconnected');
  });
}

/**
 * Start action recording session
 */
export async function startActionRecording(backendPort: number): Promise<{ sessionId: string; pageUrl: string }> {
  initActionRecorder(backendPort);

  const response = await fetch(`http://localhost:${backendPort}/api/workflows/builder-mode/webhook/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start action recording');
  }

  return await response.json();
}

/**
 * Stop action recording session
 */
export async function stopActionRecording(backendPort: number): Promise<void> {
  const response = await fetch(`http://localhost:${backendPort}/api/workflows/builder-mode/webhook/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to stop action recording');
  }
}

/**
 * Get action recorder status
 */
export async function getActionRecorderStatus(backendPort: number): Promise<{
  active: boolean;
  recording: boolean;
  sessionId: string | null;
  pageUrl: string | null;
}> {
  const response = await fetch(`http://localhost:${backendPort}/api/workflows/builder-mode/status`);

  if (!response.ok) {
    throw new Error('Failed to get action recorder status');
  }

  return await response.json();
}

/**
 * Get recorded actions
 */
export async function getRecordedActions(backendPort: number): Promise<RecordedAction[]> {
  const response = await fetch(`http://localhost:${backendPort}/api/workflows/builder-mode/actions`);

  if (!response.ok) {
    throw new Error('Failed to get recorded actions');
  }

  return await response.json();
}

/**
 * Reset recorded actions
 */
export async function resetActions(backendPort: number): Promise<void> {
  const response = await fetch(`http://localhost:${backendPort}/api/workflows/builder-mode/actions/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to reset actions');
  }
}

/**
 * Register callback for when a single action is recorded (real-time)
 */
export function onActionRecorded(
  callbackId: string,
  callback: (action: RecordedAction) => void
): () => void {
  actionRecordedCallbacks.set(callbackId, callback);

  // Return cleanup function
  return () => {
    actionRecordedCallbacks.delete(callbackId);
  };
}

/**
 * Register callback for when actions are recorded (batch)
 */
export function onActionsRecorded(
  callbackId: string,
  callback: (actions: RecordedAction[]) => void
): () => void {
  actionsRecordedCallbacks.set(callbackId, callback);

  // Return cleanup function
  return () => {
    actionsRecordedCallbacks.delete(callbackId);
  };
}

/**
 * Register callback for recording state changes
 */
export function onRecordingStateChange(
  callbackId: string,
  callback: (isRecording: boolean) => void
): () => void {
  recordingStateCallbacks.set(callbackId, callback);

  // Return cleanup function
  return () => {
    recordingStateCallbacks.delete(callbackId);
  };
}
