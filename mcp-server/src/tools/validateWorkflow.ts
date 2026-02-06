import { Workflow } from '@automflows/shared';
import { WorkflowValidator, ValidationResult } from '../utils/workflowValidator.js';

export interface ValidateWorkflowParams {
  workflow: Workflow;
}

export function validateWorkflow(params: ValidateWorkflowParams): ValidationResult {
  const { workflow } = params;
  return WorkflowValidator.validate(workflow);
}
