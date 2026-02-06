import { Workflow } from '@automflows/shared';
import { BackendClient, ExecutionResult } from '../utils/backendClient.js';

export interface ExecuteWorkflowParams {
  workflow: Workflow;
  traceLogs?: boolean;
  recordSession?: boolean;
}

export async function executeWorkflow(params: ExecuteWorkflowParams): Promise<ExecutionResult> {
  const { workflow, traceLogs = false, recordSession = false } = params;
  const client = new BackendClient();

  const result = await client.executeWorkflow(workflow, {
    traceLogs,
    recordSession,
  });

  return result;
}

export async function stopExecution(): Promise<{ success: boolean; message: string }> {
  const client = new BackendClient();
  return await client.stopExecution();
}
