import { Workflow } from '@automflows/shared';
import { getLLMProvider } from '../llm/index.js';
import { ErrorAnalyzer } from '../utils/errorAnalyzer.js';
import { WorkflowValidator } from '../utils/workflowValidator.js';

export interface FixWorkflowParams {
  workflow: Workflow;
  errorAnalysis: Array<{
    category: string;
    severity: string;
    message: string;
    nodeId?: string;
    suggestedFix?: string;
    extractedSelectors?: string[];
    correctSelector?: string;
    failedSelector?: string;
  }>;
  errorMessage?: string;
  executionLogs?: string[];
}

export async function fixWorkflow(params: FixWorkflowParams): Promise<Workflow> {
  const { workflow, errorAnalysis, errorMessage, executionLogs } = params;

  // Try LLM-based fixing first
  const llmProvider = getLLMProvider();
  if (llmProvider && errorMessage) {
    try {
      const fixedWorkflow = await llmProvider.analyzeAndFixWorkflow(
        workflow,
        errorMessage,
        executionLogs
      );

      // Validate the fixed workflow
      const validation = WorkflowValidator.validate(fixedWorkflow);
      if (validation.valid) {
        return fixedWorkflow;
      }
    } catch (error: any) {
      console.warn('LLM workflow fixing failed, falling back to rule-based:', error.message);
      // Fall through to rule-based fixing
    }
  }

  // Fallback to rule-based fixing
  return fixWorkflowRuleBased(workflow, errorAnalysis);
}

function fixWorkflowRuleBased(
  workflow: Workflow,
  errorAnalysis: FixWorkflowParams['errorAnalysis']
): Workflow {
  const fixes = ErrorAnalyzer.suggestFixes(
    errorAnalysis.map(e => ({
      category: e.category as any,
      severity: e.severity as any,
      message: e.message,
      nodeId: e.nodeId,
      suggestedFix: e.suggestedFix,
      extractedSelectors: (e as any).extractedSelectors,
      correctSelector: (e as any).correctSelector,
      failedSelector: (e as any).failedSelector,
    })),
    workflow
  );

  // Apply fixes
  const fixedWorkflow: Workflow = {
    nodes: fixes.nodes || workflow.nodes,
    edges: fixes.edges || workflow.edges,
  };

  // Additional rule-based fixes with automatic selector fixing
  for (const issue of errorAnalysis) {
    if (issue.nodeId) {
      const nodeIndex = fixedWorkflow.nodes.findIndex(n => n.id === issue.nodeId);
      if (nodeIndex !== -1) {
        const node = fixedWorkflow.nodes[nodeIndex];

        // Apply category-specific fixes
        switch (issue.category) {
          case 'selector':
            // Automatic selector fixing - use correctSelector if available
            if (node.data && typeof node.data === 'object') {
              const nodeData = node.data as any;
              const errorAnalysisWithSelectors = issue as any;
              
              // Fix selector if we have a correct one
              if (errorAnalysisWithSelectors.correctSelector && nodeData.selector) {
                nodeData.selector = errorAnalysisWithSelectors.correctSelector;
              }
              
              // Increase timeout as fallback
              if (!nodeData.timeout || nodeData.timeout < 30000) {
                nodeData.timeout = 30000;
              }
            }
            break;

          case 'missing_node':
            // This would require more sophisticated logic to add missing nodes
            break;

          case 'configuration':
            if (node.data && typeof node.data === 'object') {
              const nodeData = node.data as any;
              if (!nodeData.label) {
                nodeData.label = node.type;
              }
            }
            break;
        }
      }
    }
  }

  return fixedWorkflow;
}
