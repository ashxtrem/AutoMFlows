import { Workflow } from '@automflows/shared';
import { ErrorAnalyzer, ErrorAnalysis } from '../utils/errorAnalyzer.js';

export interface AnalyzeWorkflowErrorsParams {
  workflow: Workflow;
  errorMessage: string;
  executionLogs?: string[];
  currentNodeId?: string; // Current node ID when error occurred
}

export function analyzeWorkflowErrors(params: AnalyzeWorkflowErrorsParams): ErrorAnalysis[] {
  const { workflow, errorMessage, executionLogs, currentNodeId } = params;
  
  return ErrorAnalyzer.analyze(workflow, errorMessage, executionLogs, currentNodeId);
}
