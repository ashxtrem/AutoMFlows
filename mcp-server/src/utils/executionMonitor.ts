import { BackendClient, ExecutionResult } from './backendClient.js';
import { getConfig, MAX_EXECUTION_DURATION_MS, MAX_BREAKPOINT_WAIT_MS, WAIT_AFTER_CLICK_MS } from '../config.js';

function debugLog(...args: any[]): void {
  if (getConfig().verbose) {
    console.error(...args);
  }
}

export interface FailureContext {
  nodeId: string;
  error: string;
  pageUrl?: string;
}

export class ExecutionMonitor {
  /**
   * Monitor execution via polling
   */
  static async monitorExecution(
    executionId: string,
    backendClient: BackendClient,
    intervalMs: number = 1000,
    maxDurationMs: number = MAX_EXECUTION_DURATION_MS
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let consecutive404s = 0;
    const max404s = 3;

    while (Date.now() - startTime < maxDurationMs) {
      try {
        const status = await backendClient.getExecutionStatus(executionId);
        consecutive404s = 0;

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        debugLog(`[ExecutionMonitor] Poll ${executionId} (${elapsed}s): status=${status.status}, node=${status.currentNodeId || 'n/a'}`);

        if (status.status === 'completed' || status.status === 'error' || status.status === 'stopped') {
          return status;
        }

        if (status.status === 'idle') {
          console.error(`[ExecutionMonitor] Execution ${executionId} returned 'idle' - execution may have been cleaned up`);
          return status;
        }
      } catch (err: any) {
        const is404 = err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Not Found');
        if (is404) {
          consecutive404s++;
          console.error(`[ExecutionMonitor] Execution ${executionId} not found (404, attempt ${consecutive404s}/${max404s}) - may have been cleaned up after completion`);
          if (consecutive404s >= max404s) {
            console.error(`[ExecutionMonitor] Giving up after ${max404s} consecutive 404s for ${executionId}`);
            return {
              executionId,
              status: 'unknown',
              error: `Execution ${executionId} was cleaned up (not found after ${max404s} attempts). It likely completed or errored before polling started.`,
            };
          }
        } else {
          console.error(`[ExecutionMonitor] Error polling ${executionId}: ${err.message}`);
          throw err;
        }
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Execution status polling timeout');
  }

  /**
   * Wait for execution to pause at breakpoint
   */
  static async waitForBreakpoint(
    executionId: string,
    backendClient: BackendClient,
    intervalMs: number = 500,
    maxWaitMs: number = MAX_BREAKPOINT_WAIT_MS
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await backendClient.getExecutionStatus(executionId);

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        debugLog(`[ExecutionMonitor] Breakpoint wait ${executionId} (${elapsed}s): status=${status.status}, pausedNode=${status.pausedNodeId || 'none'}`);

        if (status.status === 'error' || status.status === 'stopped') {
          throw new Error(`Execution failed while waiting for breakpoint: ${status.error || 'Unknown error'}`);
        }

        if (status.status === 'idle') {
          throw new Error(`Execution ${executionId} returned 'idle' - execution no longer active`);
        }
        
        if (status.pausedNodeId && status.pauseReason === 'breakpoint') {
          return;
        }
      } catch (err: any) {
        if (err.message?.includes('404') || err.message?.includes('not found')) {
          throw new Error(`Execution ${executionId} not found (cleaned up) while waiting for breakpoint`);
        }
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Timeout waiting for breakpoint');
  }

  /**
   * Detect failures and extract context from execution result
   */
  static extractFailureContext(
    executionResult: ExecutionResult
  ): FailureContext[] {
    const failures: FailureContext[] = [];

    if (executionResult.status === 'error' && executionResult.error) {
      // Try to extract node ID and error message from error string
      // Error format might be: "Node <nodeId> failed: <error message>"
      const errorMatch = executionResult.error.match(/Node\s+([^\s]+)\s+failed[:\s]+(.+)/i);
      if (errorMatch) {
        failures.push({
          nodeId: errorMatch[1],
          error: errorMatch[2],
        });
      } else {
        // Fallback: use currentNodeId if available
        failures.push({
          nodeId: executionResult.currentNodeId || 'unknown',
          error: executionResult.error,
        });
      }
    }

    return failures;
  }

  /**
   * Monitor execution with event-based approach (if socket.io is available)
   * Falls back to polling if socket not available
   */
  static async monitorExecutionWithEvents(
    executionId: string,
    backendClient: BackendClient,
    maxDurationMs: number = MAX_EXECUTION_DURATION_MS
  ): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        backendClient.offExecutionEvent(eventHandler);
        reject(new Error('Execution monitoring timeout'));
      }, maxDurationMs);

      const eventHandler = (event: { type: string; data: any; timestamp: number }) => {
        if (event.type === 'NODE_ERROR' || event.type === 'EXECUTION_COMPLETE' || event.type === 'EXECUTION_STOPPED') {
          clearTimeout(timeout);
          backendClient.offExecutionEvent(eventHandler);
          
          backendClient.getExecutionStatus(executionId).then(resolve).catch(reject);
        }
      };

      backendClient.connectWebSocket();
      backendClient.onExecutionEvent(eventHandler);

      // Also poll as fallback
      this.monitorExecution(executionId, backendClient, WAIT_AFTER_CLICK_MS, maxDurationMs)
        .then(result => {
          clearTimeout(timeout);
          backendClient.offExecutionEvent(eventHandler);
          resolve(result);
        })
        .catch(reject);
    });
  }
}
