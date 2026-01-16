import { io, Socket } from 'socket.io-client';
import { Workflow, ExecuteWorkflowRequest, ExecutionStatusResponse, StopExecutionResponse, ScreenshotConfig, ReportConfig } from '@automflows/shared';

let socket: Socket | null = null;
let backendPort: number | null = null;

/**
 * Get backend port from port file or environment variable
 */
async function getBackendPort(): Promise<number> {
  if (backendPort) {
    return backendPort;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
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
  } catch (error) {
    // Ignore errors, will use fallback
  }
  
  const fallbackPort = (import.meta as any).env?.VITE_BACKEND_PORT 
    ? parseInt((import.meta as any).env.VITE_BACKEND_PORT, 10)
    : 3003;
  backendPort = fallbackPort;
  return backendPort;
}

/**
 * Initialize Socket.io connection
 */
export async function initializeSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  const port = await getBackendPort();
  const socketUrl = `http://localhost:${port}`;
  
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Connected to backend via Socket.io');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from backend');
  });

  socket.on('error', (error) => {
    console.error('Socket.io error:', error);
  });

  return socket;
}

/**
 * Execute workflow on backend
 */
export async function executeWorkflow(
  workflow: Workflow,
  traceLogs: boolean = false,
  screenshotConfig?: ScreenshotConfig,
  reportConfig?: ReportConfig,
  recordSession: boolean = false
): Promise<{ executionId: string; status: string }> {
  const port = await getBackendPort();
  const request: ExecuteWorkflowRequest = {
    workflow,
    traceLogs,
    screenshotConfig,
    reportConfig,
    recordSession,
  };

  const response = await fetch(`http://localhost:${port}/api/workflows/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to execute workflow');
  }

  return await response.json();
}

/**
 * Get execution status
 */
export async function getExecutionStatus(): Promise<ExecutionStatusResponse> {
  const port = await getBackendPort();
  const response = await fetch(`http://localhost:${port}/api/workflows/execution/status`);

  if (!response.ok) {
    throw new Error('Failed to get execution status');
  }

  return await response.json();
}

/**
 * Stop execution
 */
export async function stopExecution(): Promise<StopExecutionResponse> {
  const port = await getBackendPort();
  const response = await fetch(`http://localhost:${port}/api/workflows/execution/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to stop execution');
  }

  return await response.json();
}

/**
 * Get Socket.io instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect Socket.io
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
