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
  | { needsModeSelection: true; message: string }
  | { workflow: Workflow }
  | { workflow: Workflow; executionId: string; status: string; iterations: number; fixedNodes: any[] };

/**
 * Create a workflow with two options:
 * 1. Guess selectors (faster) - uses create_workflow or create_and_execute_workflow
 * 2. Use snapshots - builds from accessibility snapshots with accurate getByRole locators
 */
export async function createWorkflowViaSnapshots(
  params: CreateWorkflowViaSnapshotsParams
): Promise<CreateWorkflowViaSnapshotsResult> {
  const { userRequest, useCase, preferredMode, snapshotsPath, executeImmediately } = params;

  // When preferredMode not provided, ask user to choose
  if (!preferredMode) {
    return {
      needsModeSelection: true,
      message: `How would you like to create the workflow?

**Option 1 (faster):** Create workflow using guess selectors - uses create_workflow or create_and_execute_workflow. Selectors are inferred from your description and may need adjustment.

**Option 2:** Create workflow using accessibility snapshots - more accurate locators (getByRole) derived from snapshot data. Requires snapshotsPath (e.g. output/start-1771430710449/snapshots) from a previous execution with snapshotAllNodes enabled.

Please specify preferredMode: "guess" or "snapshots". If snapshots, also provide snapshotsPath.`,
    };
  }

  if (preferredMode === 'guess') {
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
    } else {
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
  }

  // preferredMode === 'snapshots'
  if (!snapshotsPath || snapshotsPath.trim() === '') {
    throw new Error(
      'snapshotsPath is required when preferredMode is "snapshots". Provide path to snapshot directory (e.g. output/start-1771430710449/snapshots)'
    );
  }

  const workflow = buildWorkflowFromSnapshots(userRequest, useCase, snapshotsPath);

  const validation = WorkflowValidator.validate(workflow);
  if (!validation.valid) {
    console.warn('Workflow validation warnings:', validation.errors);
  }

  return { workflow };
}
