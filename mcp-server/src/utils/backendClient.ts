import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import { Workflow, ExecuteWorkflowRequest, ExecutionStatusResponse } from '@automflows/shared';
import { getConfig } from '../config.js';

function debugLog(...args: any[]): void {
  if (getConfig().verbose) {
    console.error(...args);
  }
}

export interface ExecutionResult {
  executionId: string;
  status: 'running' | 'completed' | 'error' | 'stopped' | 'idle' | 'unknown';
  currentNodeId?: string | null;
  error?: string | null;
  pausedNodeId?: string | null;
  pauseReason?: 'wait-pause' | 'breakpoint' | null;
  /** Populated when partial results are returned on timeout */
  timedOut?: boolean;
  /** Trace logs from execution, when requested */
  logs?: string[];
  /** Output directory path from execution tracker (contains screenshots, snapshots, videos) */
  outputDirectory?: string;
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

  async getExecutionStatus(executionId?: string): Promise<ExecutionResult> {
    try {
      const url = executionId
        ? `/api/workflows/execution/${encodeURIComponent(executionId)}`
        : '/api/workflows/execution/status';
      const response = await this.httpClient.get<ExecutionStatusResponse>(url);

      return {
        executionId: response.data.executionId || '',
        status: response.data.status as ExecutionResult['status'],
        currentNodeId: response.data.currentNodeId || null,
        error: response.data.error || null,
        pausedNodeId: response.data.pausedNodeId || null,
        pauseReason: response.data.pauseReason || null,
        outputDirectory: response.data.outputDirectory || undefined,
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
    maxDurationMs: number = 300000,
    onProgress?: (status: ExecutionResult) => void
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    let consecutive404s = 0;
    const max404s = 3;
    let lastStatus: ExecutionResult | null = null;

    while (Date.now() - startTime < maxDurationMs) {
      try {
        let status: ExecutionResult;
        try {
          status = await this.getExecutionStatus(executionId);
          consecutive404s = 0;
        } catch (err: any) {
          const is404 = err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Not Found');
          if (is404 && executionId) {
            consecutive404s++;
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.error(`[BackendClient] Poll ${executionId} (${elapsed}s): 404 not found (attempt ${consecutive404s}/${max404s})`);

            if (consecutive404s >= max404s) {
              console.error(`[BackendClient] Execution ${executionId} cleaned up after ${max404s} consecutive 404s - status unknown`);
              return {
                executionId,
                status: lastStatus?.status === 'error' ? 'error' : 'unknown',
                error: lastStatus?.error || `Execution cleaned up (not found after ${max404s} attempts)`,
              };
            }

            // Try the generic status endpoint as fallback
            try {
              const recent = await this.getExecutionStatus();
              if (recent.executionId === executionId && ['completed', 'error', 'stopped'].includes(recent.status)) {
                return recent;
              }
            } catch {
              // Ignore fallback errors
            }

            await new Promise(resolve => setTimeout(resolve, intervalMs));
            continue;
          }
          throw err;
        }

        consecutiveErrors = 0;
        lastStatus = status;

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        debugLog(`[BackendClient] Poll ${executionId} (${elapsed}s): status=${status.status}, node=${status.currentNodeId || 'n/a'}`);

        // Notify caller of intermediate progress
        if (onProgress) {
          onProgress(status);
        }

        if (status.executionId === executionId || !executionId) {
          if (status.status === 'completed' || status.status === 'error' || status.status === 'stopped') {
            return status;
          }

          if (status.status === 'idle') {
            console.error(`[BackendClient] Execution ${executionId} returned 'idle' - no longer active`);
            return status;
          }
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error: any) {
        consecutiveErrors++;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.error(`[BackendClient] Poll ${executionId} (${elapsed}s): error (${consecutiveErrors}/${maxConsecutiveErrors}): ${error.message}`);
        if (consecutiveErrors >= maxConsecutiveErrors) {
          // Return partial result instead of throwing
          if (lastStatus) {
            return { ...lastStatus, timedOut: true };
          }
          throw new Error(
            `Failed to poll execution status after ${maxConsecutiveErrors} consecutive errors: ${error.message}`
          );
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    // Timeout: return partial result instead of throwing
    if (lastStatus) {
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      return {
        ...lastStatus,
        timedOut: true,
        error: (lastStatus.error || '') +
          ` [Polling timed out after ${elapsedSeconds}s. Execution may still be running. ID: ${executionId}]`,
      };
    }

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    return {
      executionId,
      status: 'running',
      timedOut: true,
      error: `Execution status polling timed out after ${elapsedSeconds}s (max: ${Math.round(maxDurationMs / 1000)}s). ` +
        `Execution ID: ${executionId}. The execution may still be running.`,
    };
  }

  /**
   * Fetch execution trace logs from the backend.
   * Returns an array of log strings, or empty array if unavailable.
   */
  async getExecutionLogs(executionId?: string): Promise<string[]> {
    try {
      const url = executionId
        ? `/api/workflows/execution/${encodeURIComponent(executionId)}/logs`
        : '/api/workflows/execution/logs';
      const response = await this.httpClient.get<{ success: boolean; logs: string[] }>(url);
      return response.data.logs || [];
    } catch {
      return [];
    }
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
   * Get captured DOM from a failed execution
   * Returns the PageDebugInfo that was captured during error
   */
  async getCapturedDOM(executionId?: string): Promise<any | null> {
    try {
      const url = executionId
        ? `/api/workflows/execution/${encodeURIComponent(executionId)}/captured-dom`
        : '/api/workflows/execution/captured-dom';
      
      const response = await this.httpClient.get<{ success: boolean; debugInfo: any }>(url);
      
      if (!response.data.success || !response.data.debugInfo) {
        return null;
      }
      
      return response.data.debugInfo;
    } catch (error: any) {
      // Return null if DOM not available (404 or other errors)
      console.warn(`Failed to get captured DOM: ${error.message}`);
      return null;
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
