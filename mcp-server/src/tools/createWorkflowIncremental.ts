import { Workflow, NodeType } from '@automflows/shared';
import { WorkflowBuilder } from '../utils/workflowBuilder.js';
import { WorkflowModifier } from '../utils/workflowModifier.js';
import { RequestAnalyzer, ParsedStep } from '../utils/requestAnalyzer.js';
import { TextSelectorAnalyzer, AccessibilityNode } from '../utils/textSelectorAnalyzer.js';
import { findElementInSnapshot } from '../utils/snapshotWorkflowBuilder.js';
import { buildNodeConfig, SelectorInfo } from '../utils/nodeFactory.js';
import { BackendClient } from '../utils/backendClient.js';
import { ExecutionMonitor } from '../utils/executionMonitor.js';
import { executeWorkflow } from './executeWorkflow.js';
import { getConfig, WAIT_AFTER_NAVIGATE_MS, WAIT_AFTER_CLICK_MS, MAX_PHASE_DURATION_MS } from '../config.js';

function debugLog(...args: any[]): void {
  if (getConfig().verbose) {
    console.error(...args);
  }
}

export interface CreateWorkflowIncrementalParams {
  userRequest: string;
  useCase: string;
  maxPhaseDurationMs?: number;
}

export interface CreateWorkflowIncrementalResult {
  workflow: Workflow;
  phases: number;
  executionId?: string;
  status: 'completed' | 'partial' | 'seed_only';
  phaseSummary: string[];
}

interface StepPhase {
  steps: ParsedStep[];
  reason: string;
}

const PAGE_TRANSITION_ACTIONS = new Set<string>(['navigate', 'submit']);

/**
 * Determines whether a click step is likely to cause a page navigation.
 */
function isPageTransitionClick(step: ParsedStep): boolean {
  if (step.action !== 'click') return false;
  const t = (step.target || '').toLowerCase();
  const d = step.description.toLowerCase();
  const transitionHints = [
    'product', 'item', 'result', 'link', 'page', 'next',
    'proceed', 'continue', 'checkout', 'navigate',
  ];
  return transitionHints.some(h => t.includes(h) || d.includes(h));
}

/**
 * Group parsed steps into "page phases" using smart batching.
 *
 * Each phase contains steps that operate on the same page state.
 * A new phase starts when the next step would cause a page transition
 * (navigate, submit, or a click that likely navigates).
 */
export function groupStepsIntoPhases(steps: ParsedStep[]): StepPhase[] {
  const phases: StepPhase[] = [];
  let currentPhase: ParsedStep[] = [];
  let reason = 'initial actions';

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Navigate steps always start a new phase (the seed handles the first navigate)
    if (step.action === 'navigate') {
      if (currentPhase.length > 0) {
        phases.push({ steps: currentPhase, reason });
      }
      currentPhase = [step];
      reason = `navigate to ${step.target || 'page'}`;
      phases.push({ steps: currentPhase, reason });
      currentPhase = [];
      reason = `actions after navigation`;
      continue;
    }

    currentPhase.push(step);

    // Check if this step ends the current phase
    const endsPhase =
      PAGE_TRANSITION_ACTIONS.has(step.action) ||
      isPageTransitionClick(step);

    if (endsPhase) {
      phases.push({ steps: currentPhase, reason: reason || step.description });
      currentPhase = [];
      reason = `actions after ${step.action}`;
    }
  }

  if (currentPhase.length > 0) {
    phases.push({ steps: currentPhase, reason: reason || 'remaining actions' });
  }

  return phases;
}

/**
 * Build a minimal seed workflow: Start -> OpenBrowser -> Navigate(url) -> Wait
 */
function createSeedWorkflow(url: string): Workflow {
  const builder = new WorkflowBuilder();
  const startId = builder.getStartNodeId()!;

  const browserId = builder.addNode(NodeType.OPEN_BROWSER, {
    label: 'Open Browser',
    headless: false,
    browser: 'chromium',
    viewportWidth: 1280,
    viewportHeight: 720,
  });
  builder.connectNodes(startId, browserId);

  const navId = builder.addNode(NodeType.NAVIGATION, {
    label: `Navigate to ${url}`,
    action: 'navigate',
    url,
    waitUntil: 'networkidle',
  });
  builder.connectNodes(browserId, navId);

  const waitId = builder.addNode(NodeType.WAIT, {
    label: 'Wait after navigation',
    waitType: 'timeout',
    value: String(WAIT_AFTER_NAVIGATE_MS),
    timeout: WAIT_AFTER_NAVIGATE_MS,
  });
  builder.connectNodes(navId, waitId);

  return builder.build();
}

/**
 * Find the last node in a workflow (node with no outgoing edges).
 */
function findLastNodeId(workflow: Workflow): string {
  const nodesWithOutgoing = new Set(workflow.edges.map(e => e.source));
  const endNodes = workflow.nodes.filter(n => !nodesWithOutgoing.has(n.id));
  if (endNodes.length > 0) {
    return endNodes.reduce((rightmost, node) =>
      node.position.x > rightmost.position.x ? node : rightmost
    ).id;
  }
  return workflow.nodes[workflow.nodes.length - 1].id;
}

/**
 * Execute a workflow with breakpoints enabled so that it pauses at the last node.
 * Then capture the accessibility snapshot from the live page.
 */
async function executeAndCaptureSnapshot(
  workflow: Workflow,
  lastNodeId: string,
  backendClient: BackendClient,
  maxDurationMs: number
): Promise<{ executionId: string; snapshot: AccessibilityNode | null }> {
  // Mark the last node with a breakpoint
  const workflowWithBreakpoint: Workflow = {
    ...workflow,
    nodes: workflow.nodes.map(n => {
      if (n.id === lastNodeId) {
        return {
          ...n,
          data: { ...n.data, breakpoint: true },
        };
      }
      return n;
    }),
  };

  const execResult = await executeWorkflow({
    workflow: workflowWithBreakpoint,
    traceLogs: false,
    recordSession: false,
    breakpointConfig: {
      enabled: true,
      breakpointAt: 'post',
      breakpointFor: 'marked',
    },
  });

  // Wait for breakpoint
  try {
    await ExecutionMonitor.waitForBreakpoint(
      execResult.executionId,
      backendClient,
      500,
      maxDurationMs
    );
  } catch (err: any) {
    // If breakpoint wait fails, the execution may have completed already
    const status = await backendClient.getExecutionStatus(execResult.executionId);
    if (status.status === 'completed' || status.status === 'error') {
      return { executionId: execResult.executionId, snapshot: null };
    }
    throw err;
  }

  // Capture a11y snapshot while paused
  const snapshot = await backendClient.captureAccessibilitySnapshotAtBreakpoint(execResult.executionId);

  // Continue execution (disable breakpoints and let it finish)
  await backendClient.continueExecution(execResult.executionId);

  return { executionId: execResult.executionId, snapshot };
}

/**
 * Execute the full seed workflow (no breakpoints) and capture snapshot from the last node.
 */
async function executeSeedAndCaptureSnapshot(
  workflow: Workflow,
  backendClient: BackendClient,
  maxDurationMs: number
): Promise<{ executionId: string; snapshot: AccessibilityNode | null }> {
  const lastNodeId = findLastNodeId(workflow);

  // For the seed, we set breakpoint on the last wait node (post)
  return executeAndCaptureSnapshot(workflow, lastNodeId, backendClient, maxDurationMs);
}

/**
 * Append phase nodes to an existing workflow, using the snapshot for text selectors.
 */
function appendPhaseNodesToWorkflow(
  workflow: Workflow,
  phase: StepPhase,
  snapshotTree: AccessibilityNode | null
): { workflow: Workflow; lastNodeId: string; appendedCount: number } {
  let currentWorkflow = workflow;
  let lastNodeId = findLastNodeId(currentWorkflow);
  let appendedCount = 0;
  let lastExtractVariable: string | undefined;

  for (let i = 0; i < phase.steps.length; i++) {
    const step = phase.steps[i];

    // Track extract variables for smart verify generation
    if (step.action === 'extract') {
      lastExtractVariable = step.outputVariable || 'extractedData';
    }

    // Navigate steps get special handling with an auto-appended wait
    if (step.action === 'navigate') {
      if (step.target) {
        const navNode = {
          id: `navigation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: NodeType.NAVIGATION,
          position: { x: 0, y: 0 },
          data: {
            type: NodeType.NAVIGATION,
            label: `Navigate to ${step.target}`,
            action: 'navigate',
            url: step.target,
            waitUntil: 'networkidle',
          },
        };
        currentWorkflow = WorkflowModifier.insertNodeAfter(currentWorkflow, lastNodeId, navNode);
        lastNodeId = navNode.id;

        const waitNode = {
          id: `wait-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: NodeType.WAIT,
          position: { x: 0, y: 0 },
          data: {
            type: NodeType.WAIT,
            label: 'Wait after navigation',
            waitType: 'timeout',
            value: String(WAIT_AFTER_NAVIGATE_MS),
            timeout: WAIT_AFTER_NAVIGATE_MS,
          },
        };
        currentWorkflow = WorkflowModifier.insertNodeAfter(currentWorkflow, lastNodeId, waitNode);
        lastNodeId = waitNode.id;
        appendedCount++;
      }
      continue;
    }

    // Build SelectorInfo from snapshot analysis
    let selectorInfo: SelectorInfo | null = null;

    if (snapshotTree) {
      const textResult = TextSelectorAnalyzer.analyzeForTextSelector(
        snapshotTree,
        step.action,
        step.target,
        step.value
      );

      if (textResult) {
        selectorInfo = { selector: textResult.text, selectorType: 'text', nth: textResult.nth };
      } else {
        const roleResult = findElementInSnapshot(snapshotTree, step.action, step.target);
        if (roleResult) {
          selectorInfo = { selector: roleResult.selector, selectorType: 'getByRole' };
        }
      }
    }

    const nodeConfig = buildNodeConfig(step, selectorInfo, lastExtractVariable);
    if (!nodeConfig) continue;

    const newNode = {
      id: `${nodeConfig.type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: nodeConfig.type,
      position: { x: 0, y: 0 },
      data: {
        type: nodeConfig.type,
        ...nodeConfig.data,
      },
    };

    currentWorkflow = WorkflowModifier.insertNodeAfter(currentWorkflow, lastNodeId, newNode);
    lastNodeId = newNode.id;
    appendedCount++;

    // Auto-insert wait after click/navigate actions (unless next step is a wait)
    const nextStep = i + 1 < phase.steps.length ? phase.steps[i + 1] : undefined;
    if ((step.action === 'click' || step.action === 'submit') && nextStep?.action !== 'wait') {
      const waitNode = {
        id: `wait-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: NodeType.WAIT,
        position: { x: 0, y: 0 },
        data: {
          type: NodeType.WAIT,
          label: `Wait after ${step.action}`,
          waitType: 'timeout',
          value: String(WAIT_AFTER_CLICK_MS),
          timeout: WAIT_AFTER_CLICK_MS,
        },
      };
      currentWorkflow = WorkflowModifier.insertNodeAfter(currentWorkflow, lastNodeId, waitNode);
      lastNodeId = waitNode.id;
    }
  }

  return { workflow: currentWorkflow, lastNodeId, appendedCount };
}

/**
 * Create a workflow incrementally using accessibility snapshots.
 *
 * Flow:
 * 1. Parse user request into steps
 * 2. Group steps into page-phases (smart batching)
 * 3. Build seed workflow (Start -> OpenBrowser -> Navigate)
 * 4. Execute seed, capture snapshot
 * 5. For each subsequent phase: use snapshot to build nodes with text selectors, append, execute, capture next snapshot
 * 6. Return the final workflow
 */
export async function createWorkflowIncremental(
  params: CreateWorkflowIncrementalParams
): Promise<CreateWorkflowIncrementalResult> {
  const { userRequest, useCase, maxPhaseDurationMs = MAX_PHASE_DURATION_MS } = params;
  const backendClient = new BackendClient();
  const phaseSummary: string[] = [];

  // Analyze request clarity
  const clarity = RequestAnalyzer.analyzeClarity(userRequest);
  if (!clarity.isClear && clarity.clarificationQuestions && clarity.clarificationQuestions.length > 0) {
    throw new Error(
      `Request needs clarification:\n${clarity.clarificationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    );
  }

  // Parse steps
  const allSteps = RequestAnalyzer.parseSequentialSteps(userRequest);
  if (allSteps.length === 0) {
    throw new Error('Could not parse any actionable steps from the request');
  }

  // Extract URL for seed workflow
  const urlMatch = userRequest.match(/https?:\/\/[^\s,]+/);
  const navigateStep = allSteps.find(s => s.action === 'navigate');
  const seedUrl = urlMatch?.[0] || navigateStep?.target || '';

  if (!seedUrl) {
    throw new Error('No URL found in the request. Please include a target URL (e.g., https://amazon.in)');
  }

  // Filter out the first navigate step since the seed workflow handles it
  let firstSeedNavRemoved = false;
  const remainingSteps = allSteps.filter(s => {
    if (!firstSeedNavRemoved && s.action === 'navigate' && s.target === seedUrl) {
      firstSeedNavRemoved = true;
      return false;
    }
    return true;
  });

  // Group remaining steps into phases
  const phases = groupStepsIntoPhases(remainingSteps);
  phaseSummary.push(`Parsed ${allSteps.length} steps into ${phases.length} phase(s) + seed`);

  // Phase 0: Build and execute seed workflow
  let workflow = createSeedWorkflow(seedUrl);
  phaseSummary.push(`Seed: Start -> Open Browser -> Navigate to ${seedUrl} -> Wait`);

  let lastExecutionId: string | undefined;
  let currentSnapshot: AccessibilityNode | null = null;

  try {
    const seedResult = await executeSeedAndCaptureSnapshot(workflow, backendClient, maxPhaseDurationMs);
    lastExecutionId = seedResult.executionId;
    currentSnapshot = seedResult.snapshot;
    phaseSummary.push(`Seed executed, snapshot captured: ${currentSnapshot ? 'yes' : 'no'}`);
  } catch (err: any) {
    phaseSummary.push(`Seed execution failed: ${err.message}`);
    return {
      workflow,
      phases: 0,
      status: 'seed_only',
      phaseSummary,
    };
  }

  // Iterate through phases
  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
    const phase = phases[phaseIdx];
    const stepDescriptions = phase.steps.map(s => `${s.action}${s.target ? ` "${s.target}"` : ''}`).join(', ');

    // Append phase nodes using current snapshot
    const { workflow: extendedWorkflow, lastNodeId, appendedCount } = appendPhaseNodesToWorkflow(
      workflow,
      phase,
      currentSnapshot
    );
    workflow = extendedWorkflow;

    if (appendedCount === 0) {
      phaseSummary.push(`Phase ${phaseIdx + 1}: skipped (no actionable steps)`);
      continue;
    }

    phaseSummary.push(`Phase ${phaseIdx + 1}: added ${appendedCount} node(s) for [${stepDescriptions}]`);

    // If there are more phases, execute and capture snapshot for the next phase
    if (phaseIdx < phases.length - 1) {
      try {
        try { await backendClient.stopExecution(); } catch (e: any) { debugLog('[Incremental] stopExecution between phases:', e.message); }

        const phaseResult = await executeAndCaptureSnapshot(
          workflow,
          lastNodeId,
          backendClient,
          maxPhaseDurationMs
        );
        lastExecutionId = phaseResult.executionId;
        currentSnapshot = phaseResult.snapshot;
        phaseSummary.push(`Phase ${phaseIdx + 1} executed, snapshot: ${currentSnapshot ? 'captured' : 'failed'}`);
      } catch (err: any) {
        phaseSummary.push(`Phase ${phaseIdx + 1} execution failed: ${err.message}. Continuing with previous snapshot.`);
      }
    }
  }

  try { await backendClient.stopExecution(); } catch (e: any) { debugLog('[Incremental] stopExecution cleanup:', e.message); }

  return {
    workflow,
    phases: phases.length,
    executionId: lastExecutionId,
    status: phases.length > 0 ? 'completed' : 'seed_only',
    phaseSummary,
  };
}
