import { Workflow } from '@automflows/shared';
import { getLLMProvider } from '../llm/index.js';
import { ErrorAnalyzer } from '../utils/errorAnalyzer.js';
import { WorkflowValidator } from '../utils/workflowValidator.js';
import { BackendClient } from '../utils/backendClient.js';
import { DOMSelectorInference } from '../utils/domSelectorInference.js';
import { WorkflowModifier } from '../utils/workflowModifier.js';

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
    pageUrl?: string;
  }>;
  errorMessage?: string;
  executionLogs?: string[];
  executionId?: string; // NEW: Fetch DOM from this execution
  useDOMCapture?: boolean; // NEW: Enable DOM-based fixing (default: true)
}

export async function fixWorkflow(params: FixWorkflowParams): Promise<Workflow> {
  const { 
    workflow, 
    errorAnalysis, 
    errorMessage, 
    executionLogs, 
    executionId,
    useDOMCapture = true 
  } = params;

  // Try DOM-based fixing first if enabled and we have selector errors
  const hasSelectorErrors = errorAnalysis.some(e => e.category === 'selector');
  if (useDOMCapture && hasSelectorErrors && executionId) {
    try {
      const backendClient = new BackendClient();
      const pageDebugInfo = await backendClient.getCapturedDOM(executionId);
      
      if (pageDebugInfo) {
        console.log('Using DOM-based fixing with captured DOM');
        const fixedWorkflow = await fixWorkflowWithDOM(workflow, errorAnalysis, pageDebugInfo);
        
        // Validate the fixed workflow
        const validation = WorkflowValidator.validate(fixedWorkflow);
        if (validation.valid) {
          return fixedWorkflow;
        }
      }
    } catch (error: any) {
      console.warn('DOM-based fixing failed, falling back to other methods:', error.message);
    }
  }

  // Try LLM-based fixing
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

/**
 * Fix workflow using captured DOM information
 */
async function fixWorkflowWithDOM(
  workflow: Workflow,
  errorAnalysis: FixWorkflowParams['errorAnalysis'],
  pageDebugInfo: any
): Promise<Workflow> {
  let fixedWorkflow = workflow;
  
  // Convert DOM to optimized context
  const domContext = DOMSelectorInference.convertToOptimizedContext(pageDebugInfo);
  const pageUrl = pageDebugInfo.pageUrl || domContext.pageUrl;
  
  // Group errors by page URL
  const errorsByPage = new Map<string, typeof errorAnalysis>();
  for (const error of errorAnalysis) {
    if (error.category === 'selector') {
      const url = error.pageUrl || pageUrl || 'unknown';
      if (!errorsByPage.has(url)) {
        errorsByPage.set(url, []);
      }
      errorsByPage.get(url)!.push(error);
    }
  }
  
  // Fix selectors for each page
  for (const [url, errors] of errorsByPage) {
    if (url === 'unknown' || !url) continue;
    
    // Update selectors for all nodes on this page
    const { workflow: updatedWorkflow, updates } = DOMSelectorInference.updateSelectorsForPage(
      fixedWorkflow,
      url,
      domContext
    );
    
    fixedWorkflow = updatedWorkflow;
    
    if (updates.length > 0) {
      console.log(`Fixed ${updates.length} selectors using DOM for page: ${url}`);
      for (const update of updates) {
        console.log(`  - Node ${update.nodeId}: ${update.oldSelector} → ${update.newSelector}`);
      }
    }
  }
  
  // Apply any additional fixes from error analysis (like timeout increases)
  for (const issue of errorAnalysis) {
    if (issue.nodeId) {
      const nodeIndex = fixedWorkflow.nodes.findIndex(n => n.id === issue.nodeId);
      if (nodeIndex !== -1) {
        const node = fixedWorkflow.nodes[nodeIndex];
        
        // Increase timeout for selector errors
        if (issue.category === 'selector' && node.data && typeof node.data === 'object') {
          const nodeData = node.data as any;
          if (!nodeData.timeout || nodeData.timeout < 30000) {
            nodeData.timeout = 30000;
          }
        }
      }
    }
  }
  
  return fixedWorkflow;
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
