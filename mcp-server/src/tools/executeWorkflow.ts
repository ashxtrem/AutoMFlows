import { Workflow } from '@automflows/shared';
import { BackendClient, ExecutionResult } from '../utils/backendClient.js';

export interface ExecuteWorkflowParams {
  workflow: Workflow;
  traceLogs?: boolean;
  recordSession?: boolean;
  breakpointConfig?: {
    enabled: boolean;
    breakpointAt: 'pre' | 'post' | 'both';
    breakpointFor: 'all' | 'marked';
  };
  waitForCompletion?: boolean;
  pollIntervalMs?: number;
  maxDurationMs?: number;
  /** When true, fetch and include execution trace logs in the result */
  returnLogs?: boolean;
}

export async function executeWorkflow(params: ExecuteWorkflowParams): Promise<ExecutionResult> {
  const { 
    workflow, 
    traceLogs = false, 
    recordSession = false, 
    breakpointConfig,
    waitForCompletion = false,
    pollIntervalMs = 1000,
    maxDurationMs = 300000,
    returnLogs = false,
  } = params;
  const client = new BackendClient();

  const result = await client.executeWorkflow(workflow, {
    traceLogs: traceLogs || returnLogs,
    recordSession,
    breakpointConfig,
  });

  if (waitForCompletion && result.executionId) {
    const startTime = Date.now();
    const finalResult = await client.pollExecutionStatus(
      result.executionId,
      pollIntervalMs,
      maxDurationMs
    );

    // If polling returned a partial/timed-out result, try to stop execution
    if (finalResult.timedOut) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= maxDurationMs) {
        try {
          await client.stopExecution();
        } catch {
          // Ignore -- execution may have completed
        }
      }
    }

    // Attach logs if requested
    if (returnLogs && result.executionId) {
      finalResult.logs = await client.getExecutionLogs(result.executionId);
    }

    return finalResult;
  }

  // Non-blocking mode: optionally fetch logs if execution already finished
  if (returnLogs && result.executionId) {
    result.logs = await client.getExecutionLogs(result.executionId);
  }

  return result;
}

export async function stopExecution(): Promise<{ success: boolean; message: string }> {
  const client = new BackendClient();
  return await client.stopExecution();
}
