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
}

export async function executeWorkflow(params: ExecuteWorkflowParams): Promise<ExecutionResult> {
  const { 
    workflow, 
    traceLogs = false, 
    recordSession = false, 
    breakpointConfig,
    waitForCompletion = false,
    pollIntervalMs = 1000,
    maxDurationMs = 300000, // 5 minutes default
  } = params;
  const client = new BackendClient();

  const result = await client.executeWorkflow(workflow, {
    traceLogs,
    recordSession,
    breakpointConfig,
  });

  // If waitForCompletion is true, poll until completion or timeout
  if (waitForCompletion && result.executionId) {
    const startTime = Date.now();
    try {
      const finalResult = await client.pollExecutionStatus(
        result.executionId,
        pollIntervalMs,
        maxDurationMs
      );
      return finalResult;
    } catch (error: any) {
      const elapsedTime = Date.now() - startTime;
      // If timeout occurs, try to stop the execution to prevent it from hanging
      if (error.message?.includes('timeout') || elapsedTime >= maxDurationMs) {
        try {
          await client.stopExecution();
        } catch (stopError) {
          // Ignore stop errors - execution may have already completed
        }
        throw new Error(
          `Workflow execution timed out after ${Math.round(elapsedTime / 1000)}s (max: ${Math.round(maxDurationMs / 1000)}s). ` +
          `Execution ID: ${result.executionId}. The execution has been stopped.`
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  return result;
}

export async function stopExecution(): Promise<{ success: boolean; message: string }> {
  const client = new BackendClient();
  return await client.stopExecution();
}
