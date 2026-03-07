import { Workflow } from '@automflows/shared';
import { createWorkflow } from './createWorkflow.js';
import { executeWorkflow } from './executeWorkflow.js';
import { BackendClient, ExecutionResult } from '../utils/backendClient.js';
import { ExecutionMonitor, FailureContext } from '../utils/executionMonitor.js';
import { PageTracker } from '../utils/pageTracker.js';
import { DOMSelectorInference, PageDebugInfo } from '../utils/domSelectorInference.js';
import { WorkflowModifier } from '../utils/workflowModifier.js';
import { MAX_EXECUTION_DURATION_MS, MAX_BREAKPOINT_WAIT_MS } from '../config.js';

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

  // Step 1: Create workflow via two-pass snapshot-first strategy
  // createWorkflow now internally does: guess -> execute with snapshots -> rebuild from snapshots
  const createResult = await createWorkflow({
    userRequest: params.userRequest,
    useCase: params.useCase,
  });

  // Handle clarification needed case
  if (typeof createResult === 'object' && 'needsClarification' in createResult && createResult.needsClarification) {
    throw new Error(`Workflow creation needs clarification: ${createResult.clarificationQuestions?.join(', ')}`);
  }

  // Extract workflow from result (already snapshot-refined if two-pass succeeded)
  let workflow: Workflow;
  if (typeof createResult === 'object' && 'workflow' in createResult) {
    if (!createResult.workflow) {
      throw new Error('Workflow creation returned undefined workflow');
    }
    workflow = createResult.workflow;
  } else {
    workflow = createResult as Workflow;
  }

  // Step 2: Execute the (snapshot-refined) workflow with iterative self-healing
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
        1000,
        MAX_EXECUTION_DURATION_MS
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
        if (finalResult.status === 'error' || finalResult.status === 'unknown') {
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

      if (!pageUrl) {
        const status = await backendClient.getExecutionStatus(executionResult.executionId);
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
        500,
        MAX_BREAKPOINT_WAIT_MS
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
        MAX_EXECUTION_DURATION_MS
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
      
      // If error or unknown, continue to next iteration
      if (continuedResult.status === 'error' || continuedResult.status === 'unknown') {
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
