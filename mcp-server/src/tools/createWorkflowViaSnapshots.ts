import { Workflow } from '@automflows/shared';
import { createWorkflow } from './createWorkflow.js';
import { createAndExecuteWorkflow } from './createAndExecuteWorkflow.js';
import { buildWorkflowFromSnapshots } from '../utils/snapshotWorkflowBuilder.js';
import { WorkflowValidator } from '../utils/workflowValidator.js';

export interface CreateWorkflowViaSnapshotsParams {
  userRequest: string;
  useCase: string;
  preferredMode?: 'guess' | 'snapshots';
  snapshotsPath?: string;
  executeImmediately?: boolean;
}

export type CreateWorkflowViaSnapshotsResult =
  | { workflow: Workflow }
  | { workflow: Workflow; executionId: string; status: string; iterations: number; fixedNodes: any[] };

/**
 * Create a workflow with multiple modes:
 * - No preferredMode and no snapshotsPath: uses two-pass snapshot-first strategy
 *   (create guess workflow -> execute with snapshots -> rebuild from snapshots)
 * - preferredMode="guess": uses create_workflow (which still does two-pass internally)
 * - preferredMode="snapshots" + snapshotsPath: builds directly from existing snapshots
 * - executeImmediately: creates via two-pass then executes with self-healing loop
 */
export async function createWorkflowViaSnapshots(
  params: CreateWorkflowViaSnapshotsParams
): Promise<CreateWorkflowViaSnapshotsResult> {
  const { userRequest, useCase, preferredMode, snapshotsPath, executeImmediately } = params;

  // When snapshotsPath is provided (with or without preferredMode), build directly from snapshots
  if (snapshotsPath && snapshotsPath.trim() !== '') {
    const workflow = buildWorkflowFromSnapshots(userRequest, useCase, snapshotsPath);

    const validation = WorkflowValidator.validate(workflow);
    if (!validation.valid) {
      console.warn('Workflow validation warnings:', validation.errors);
    }

    return { workflow };
  }

  // When preferredMode is "snapshots" but no snapshotsPath, error
  if (preferredMode === 'snapshots') {
    throw new Error(
      'snapshotsPath is required when preferredMode is "snapshots". Provide path to snapshot directory (e.g. output/start-1771430710449/snapshots)'
    );
  }

  // Default path: use two-pass snapshot-first strategy via createWorkflow
  if (executeImmediately) {
    const result = await createAndExecuteWorkflow({
      userRequest,
      useCase,
    });
    return {
      workflow: result.workflow,
      executionId: result.executionId,
      status: result.status,
      iterations: result.iterations,
      fixedNodes: result.fixedNodes,
    };
  }

  // Create workflow using two-pass snapshot-first strategy
  const createResult = await createWorkflow({
    userRequest,
    useCase,
  });

  if (typeof createResult === 'object' && 'needsClarification' in createResult && createResult.needsClarification) {
    throw new Error(
      `Workflow creation needs clarification: ${createResult.clarificationQuestions?.join(', ')}`
    );
  }

  const workflow =
    typeof createResult === 'object' && 'workflow' in createResult
      ? createResult.workflow!
      : (createResult as Workflow);
  return { workflow };
}
