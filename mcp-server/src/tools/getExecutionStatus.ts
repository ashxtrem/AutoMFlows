import { BackendClient, ExecutionResult } from '../utils/backendClient.js';

export interface GetExecutionStatusParams {
  executionId?: string;
  pollUntilComplete?: boolean;
  pollIntervalMs?: number;
  maxDurationMs?: number;
}

export async function getExecutionStatus(
  params: GetExecutionStatusParams = {}
): Promise<ExecutionResult> {
  const {
    executionId,
    pollUntilComplete = false,
    pollIntervalMs = 1000,
    maxDurationMs = 300000,
  } = params;

  const client = new BackendClient();

  if (pollUntilComplete && executionId) {
    return await client.pollExecutionStatus(executionId, pollIntervalMs, maxDurationMs);
  }

  return await client.getExecutionStatus(executionId);
}

export function connectWebSocket(
  onEvent: (event: { type: string; data: any; timestamp: number }) => void
): () => void {
  const client = new BackendClient();
  const socket = client.connectWebSocket();
  
  client.onExecutionEvent(onEvent);

  // Return cleanup function
  return () => {
    client.offExecutionEvent(onEvent);
    client.disconnectWebSocket();
  };
}
