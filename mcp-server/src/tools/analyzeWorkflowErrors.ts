import { Workflow } from '@automflows/shared';
import { ErrorAnalyzer, ErrorAnalysis } from '../utils/errorAnalyzer.js';
import { BackendClient } from '../utils/backendClient.js';

export interface AnalyzeWorkflowErrorsParams {
  workflow: Workflow;
  errorMessage: string;
  executionLogs?: string[];
  currentNodeId?: string; // Current node ID when error occurred
  executionId?: string; // Fetch DOM from this execution
}

export async function analyzeWorkflowErrors(params: AnalyzeWorkflowErrorsParams): Promise<ErrorAnalysis[]> {
  const { workflow, errorMessage, executionLogs, currentNodeId, executionId } = params;
  
  // Try to fetch captured DOM if executionId is provided
  if (executionId) {
    try {
      const backendClient = new BackendClient();
      const pageDebugInfo = await backendClient.getCapturedDOM(executionId);
      
      if (pageDebugInfo) {
        // Use DOM-enhanced analysis
        return ErrorAnalyzer.analyzeWithDOM(
          workflow,
          errorMessage,
          pageDebugInfo,
          executionLogs,
          currentNodeId
        );
      }
    } catch (error) {
      // Fall back to standard analysis if DOM fetch fails
      console.warn('Failed to fetch DOM for analysis, using standard analysis:', error);
    }
  }
  
  // Standard analysis without DOM
  return ErrorAnalyzer.analyze(workflow, errorMessage, executionLogs, currentNodeId);
}
