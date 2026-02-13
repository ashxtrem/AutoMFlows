import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import { Workflow, ExecuteWorkflowRequest, ExecutionStatusResponse } from '@automflows/shared';
import { getConfig } from '../config.js';

export interface ExecutionResult {
  executionId: string;
  status: 'running' | 'completed' | 'error' | 'stopped' | 'idle';
  currentNodeId?: string | null;
  error?: string | null;
  pausedNodeId?: string | null;
  pauseReason?: 'wait-pause' | 'breakpoint' | null;
}

export class BackendClient {
  private httpClient: AxiosInstance;
  private socket: Socket | null = null;
  private config = getConfig();

  constructor() {
    this.httpClient = axios.create({
      baseURL: this.config.backendUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async executeWorkflow(
    workflow: Workflow,
    options?: {
      traceLogs?: boolean;
      screenshotConfig?: any;
      reportConfig?: any;
      recordSession?: boolean;
      breakpointConfig?: any;
      builderModeEnabled?: boolean;
    }
  ): Promise<ExecutionResult> {
    try {
      const request: ExecuteWorkflowRequest = {
        workflow,
        traceLogs: options?.traceLogs || false,
        screenshotConfig: options?.screenshotConfig,
        reportConfig: options?.reportConfig,
        recordSession: options?.recordSession || false,
        breakpointConfig: options?.breakpointConfig,
        builderModeEnabled: options?.builderModeEnabled || false,
      };

      const response = await this.httpClient.post<{ executionId: string; status: string }>(
        '/api/workflows/execute',
        request
      );

      return {
        executionId: response.data.executionId,
        status: response.data.status as ExecutionResult['status'],
      };
    } catch (error: any) {
      throw new Error(`Failed to execute workflow: ${error.message}`);
    }
  }

  async getExecutionStatus(): Promise<ExecutionResult> {
    try {
      const response = await this.httpClient.get<ExecutionStatusResponse>(
        '/api/workflows/execution/status'
      );

      return {
        executionId: response.data.executionId || '',
        status: response.data.status as ExecutionResult['status'],
        currentNodeId: response.data.currentNodeId || null,
        error: response.data.error || null,
        pausedNodeId: response.data.pausedNodeId || null,
        pauseReason: response.data.pauseReason || null,
      };
    } catch (error: any) {
      throw new Error(`Failed to get execution status: ${error.message}`);
    }
  }

  async stopExecution(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.httpClient.post<{ success: boolean; message: string }>(
        '/api/workflows/execution/stop'
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to stop execution: ${error.message}`);
    }
  }

  connectWebSocket(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketUrl = this.config.backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to backend WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from backend WebSocket');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return this.socket;
  }

  disconnectWebSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onExecutionEvent(
    callback: (event: { type: string; data: any; timestamp: number }) => void
  ): void {
    if (!this.socket) {
      this.connectWebSocket();
    }

    this.socket!.on('execution_event', callback);
  }

  offExecutionEvent(
    callback: (event: { type: string; data: any; timestamp: number }) => void
  ): void {
    if (this.socket) {
      this.socket.off('execution_event', callback);
    }
  }

  async pollExecutionStatus(
    executionId: string,
    intervalMs: number = 1000,
    maxDurationMs: number = 300000
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    while (Date.now() - startTime < maxDurationMs) {
      try {
        const status = await this.getExecutionStatus();
        
        // Reset error counter on successful status check
        consecutiveErrors = 0;
        
        // Check if this is the execution we're waiting for
        if (status.executionId === executionId || !executionId) {
          if (status.status === 'completed' || status.status === 'error' || status.status === 'stopped') {
            return status;
          }
        } else if (status.executionId && status.executionId !== executionId) {
          // If there's a different execution running, wait a bit longer
          // This handles cases where the backend hasn't switched to our execution yet
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error: any) {
        consecutiveErrors++;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(
            `Failed to poll execution status after ${maxConsecutiveErrors} consecutive errors: ${error.message}`
          );
        }
        // Wait before retrying on error
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    throw new Error(
      `Execution status polling timeout after ${elapsedSeconds}s (max: ${Math.round(maxDurationMs / 1000)}s). ` +
      `Execution ID: ${executionId}`
    );
  }

  /**
   * Capture DOM at current breakpoint
   */
  async captureDOMAtBreakpoint(): Promise<any> {
    try {
      const response = await this.httpClient.post<{ success: boolean; debugInfo: any }>(
        '/api/workflows/execution/capture-dom'
      );
      
      if (!response.data.success) {
        throw new Error('Failed to capture DOM');
      }
      
      return response.data.debugInfo;
    } catch (error: any) {
      throw new Error(`Failed to capture DOM at breakpoint: ${error.message}`);
    }
  }

  /**
   * Skip current node and continue execution
   */
  async skipNode(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.httpClient.post<{ success: boolean; message: string }>(
        '/api/workflows/execution/pause-control',
        { action: 'skip' }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to skip node: ${error.message}`);
    }
  }
}
