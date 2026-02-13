import { Workflow } from '@automflows/shared';
import { createWorkflow } from './createWorkflow.js';
import { executeWorkflow } from './executeWorkflow.js';
import { BackendClient, ExecutionResult } from '../utils/backendClient.js';
import { ExecutionMonitor, FailureContext } from '../utils/executionMonitor.js';
import { PageTracker } from '../utils/pageTracker.js';
import { DOMSelectorInference, PageDebugInfo } from '../utils/domSelectorInference.js';
import { WorkflowModifier } from '../utils/workflowModifier.js';

export interface CreateAndExecuteWorkflowParams {
  userRequest: string;
  useCase: string;
  maxIterations?: number; // Max retry attempts (default: 5)
  breakpointStrategy?: 'pre' | 'post' | 'both'; // When to breakpoint (default: 'pre')
  breakpointFor?: 'all' | 'marked'; // Which nodes (default: 'marked')
  useLLMForSelectors?: boolean; // Use LLM for selector inference (default: false)
}

export interface CreateAndExecuteWorkflowResult {
  workflow: Workflow;
  executionId: string;
  status: 'completed' | 'failed' | 'max_iterations';
  iterations: number;
  fixedNodes: Array<{ nodeId: string; oldSelector: string; newSelector: string }>;
  finalExecutionResult?: ExecutionResult;
}

export async function createAndExecuteWorkflow(
  params: CreateAndExecuteWorkflowParams
): Promise<CreateAndExecuteWorkflowResult> {
  const maxIterations = params.maxIterations || 5;
  const breakpointStrategy = params.breakpointStrategy || 'pre';
  const breakpointFor = params.breakpointFor || 'marked';
  const fixedNodes: Array<{ nodeId: string; oldSelector: string; newSelector: string }> = [];
  const backendClient = new BackendClient();

  // Step 1: Create initial workflow
  const createResult = await createWorkflow({
    userRequest: params.userRequest,
    useCase: params.useCase,
  });

  // Handle clarification needed case
  if (typeof createResult === 'object' && 'needsClarification' in createResult && createResult.needsClarification) {
    throw new Error(`Workflow creation needs clarification: ${createResult.clarificationQuestions?.join(', ')}`);
  }

  // Extract workflow from result
  let workflow: Workflow;
  if (typeof createResult === 'object' && 'workflow' in createResult) {
    if (!createResult.workflow) {
      throw new Error('Workflow creation returned undefined workflow');
    }
    workflow = createResult.workflow;
  } else {
    workflow = createResult as Workflow;
  }

  // Step 2: Iterative execution and fixing
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    try {
      // Execute workflow
      const executionResult = await executeWorkflow({ 
        workflow,
        traceLogs: false,
        recordSession: false,
      });
      
      // Monitor execution
      const finalResult = await ExecutionMonitor.monitorExecution(
        executionResult.executionId,
        backendClient,
        1000, // 1 second polling interval
        300000 // 5 minute max duration
      );
      
      // Check if completed successfully
      if (finalResult.status === 'completed') {
        return {
          workflow,
          executionId: executionResult.executionId,
          status: 'completed',
          iterations: iteration + 1,
          fixedNodes,
          finalExecutionResult: finalResult,
        };
      }
      
      // Extract failures
      const failures = ExecutionMonitor.extractFailureContext(finalResult);
      if (failures.length === 0) {
        // No failures but not completed - might be stopped or error without node context
        if (finalResult.status === 'error') {
          return {
            workflow,
            executionId: executionResult.executionId,
            status: 'failed',
            iterations: iteration + 1,
            fixedNodes,
            finalExecutionResult: finalResult,
          };
        }
        // Unexpected state - break
        break;
      }
      
      // Handle first failure (can extend to handle multiple)
      const firstFailure = failures[0];
      
      // Get page URL for failed node
      let pageUrl: string | undefined = await PageTracker.getPageUrlForNode(
        workflow,
        firstFailure.nodeId
      ) || firstFailure.pageUrl;

      // If we still don't have page URL, try to get it from execution context
      if (!pageUrl) {
        // Try to get from execution status (if available)
        const status = await backendClient.getExecutionStatus();
        // Page URL might be in error message or we need to infer it
        pageUrl = undefined; // Will be captured from DOM
      }
      
      // Find all nodes on same page (if we have page URL)
      let nodesOnSamePage: string[] = [];
      if (pageUrl) {
        nodesOnSamePage = PageTracker.findNodesOnSamePage(workflow, pageUrl);
      } else {
        // If no page URL, just fix the failed node
        nodesOnSamePage = [firstFailure.nodeId];
      }
      
      // Insert wait node before failed node
      const { workflow: updatedWorkflow, waitNodeId } = 
        WorkflowModifier.insertWaitNodeBefore(workflow, firstFailure.nodeId, {
          pause: true,
          breakpointAt: breakpointStrategy,
          breakpointFor: breakpointFor,
        });
      
      workflow = updatedWorkflow;
      
      // Execute with breakpoint
      const breakpointConfig = {
        enabled: true,
        breakpointAt: breakpointStrategy,
        breakpointFor: breakpointFor,
      };
      
      const breakpointExecutionWithConfig = await executeWorkflow({
        workflow,
        traceLogs: false,
        recordSession: false,
        breakpointConfig,
      });
      
      // Wait for breakpoint pause
      await ExecutionMonitor.waitForBreakpoint(
        breakpointExecutionWithConfig.executionId,
        backendClient,
        500, // 500ms polling interval
        60000 // 60 second max wait
      );
      
      // Capture DOM
      const pageDebugInfo: PageDebugInfo = await backendClient.captureDOMAtBreakpoint();
      
      // Get actual page URL from DOM
      const actualPageUrl = pageDebugInfo.pageUrl || pageUrl || '';
      
      // Convert to optimized context
      const domContext = DOMSelectorInference.convertToOptimizedContext(pageDebugInfo);
      
      // Update selectors for all nodes on same page
      const { workflow: fixedWorkflow, updates } = 
        DOMSelectorInference.updateSelectorsForPage(
          workflow,
          actualPageUrl,
          domContext
        );
      
      workflow = fixedWorkflow;
      fixedNodes.push(...updates);
      
      // Skip wait node and continue
      await backendClient.skipNode();
      
      // Continue monitoring
      const continuedResult = await ExecutionMonitor.monitorExecution(
        breakpointExecutionWithConfig.executionId,
        backendClient,
        1000,
        300000
      );
      
      // If completed, return success
      if (continuedResult.status === 'completed') {
        return {
          workflow,
          executionId: breakpointExecutionWithConfig.executionId,
          status: 'completed',
          iterations: iteration + 1,
          fixedNodes,
          finalExecutionResult: continuedResult,
        };
      }
      
      // If error again, continue to next iteration
      if (continuedResult.status === 'error') {
        continue;
      }
      
      // Otherwise, break
      break;
    } catch (error: any) {
      // If error occurs during fixing process, return current state
      return {
        workflow,
        executionId: '',
        status: 'failed',
        iterations: iteration + 1,
        fixedNodes,
      };
    }
  }
  
  return {
    workflow,
    executionId: '',
    status: 'max_iterations',
    iterations: maxIterations,
    fixedNodes,
  };
}
