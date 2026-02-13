import { BackendClient, ExecutionResult } from './backendClient.js';

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
    maxDurationMs: number = 300000
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxDurationMs) {
      const status = await backendClient.getExecutionStatus();
      
      if (status.executionId === executionId || !executionId) {
        if (status.status === 'completed' || status.status === 'error' || status.status === 'stopped') {
          return status;
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
    maxWaitMs: number = 60000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await backendClient.getExecutionStatus();
      
      if (status.executionId === executionId || !executionId) {
        if (status.status === 'error' || status.status === 'stopped') {
          throw new Error(`Execution failed while waiting for breakpoint: ${status.error || 'Unknown error'}`);
        }
        
        if (status.pausedNodeId && status.pauseReason === 'breakpoint') {
          return; // Breakpoint reached
        }
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
    maxDurationMs: number = 300000
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
          
          // Get final status
          backendClient.getExecutionStatus().then(resolve).catch(reject);
        }
      };

      backendClient.connectWebSocket();
      backendClient.onExecutionEvent(eventHandler);

      // Also poll as fallback
      this.monitorExecution(executionId, backendClient, 2000, maxDurationMs)
        .then(result => {
          clearTimeout(timeout);
          backendClient.offExecutionEvent(eventHandler);
          resolve(result);
        })
        .catch(reject);
    });
  }
}
