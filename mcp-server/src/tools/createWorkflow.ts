import { Workflow, NodeType } from '@automflows/shared';
import * as path from 'path';
import { getLLMProvider } from '../llm/index.js';
import { WorkflowBuilder } from '../utils/workflowBuilder.js';
import { WorkflowValidator } from '../utils/workflowValidator.js';
import { getWorkflowExample } from '../resources/workflowExamples.js';
import { RequestAnalyzer } from '../utils/requestAnalyzer.js';
import { buildNodeConfig, SelectorInfo } from '../utils/nodeFactory.js';
import { findPluginNodeByKeyword } from '../resources/nodeDocumentation.js';
import { executeWorkflow } from './executeWorkflow.js';
import { buildWorkflowFromSnapshots } from '../utils/snapshotWorkflowBuilder.js';
import { BackendClient } from '../utils/backendClient.js';
import { ExecutionMonitor } from '../utils/executionMonitor.js';
import { MAX_EXECUTION_DURATION_MS, WAIT_AFTER_CLICK_MS } from '../config.js';

export interface CreateWorkflowParams {
  userRequest: string;
  useCase: string;
  sampleWorkflowName?: string;
  /** Skip the two-pass snapshot refinement and return the guess workflow directly */
  skipSnapshotPass?: boolean;
}

export interface CreateWorkflowResult {
  workflow?: Workflow;
  needsClarification?: boolean;
  clarificationQuestions?: string[];
  /** Path to snapshots directory from the first-pass execution (if available) */
  snapshotsPath?: string;
}

/**
 * Create a workflow using a two-pass snapshot-first strategy:
 * 1. Generate a "guess" workflow (rule-based or LLM)
 * 2. Execute it with snapshotAllNodes enabled to capture accessibility snapshots
 * 3. Re-build the workflow from those snapshots for accurate getByRole selectors
 * Falls back to the guess workflow if execution or snapshot rebuild fails.
 */
export async function createWorkflow(params: CreateWorkflowParams): Promise<CreateWorkflowResult | Workflow> {
  const { userRequest, useCase, sampleWorkflowName, skipSnapshotPass } = params;

  // Analyze request clarity
  const clarity = RequestAnalyzer.analyzeClarity(userRequest);
  
  // If request is unclear, return clarification questions
  if (!clarity.isClear && clarity.clarificationQuestions && clarity.clarificationQuestions.length > 0) {
    return {
      needsClarification: true,
      clarificationQuestions: clarity.clarificationQuestions,
    };
  }

  // Pass 1: Generate guess workflow
  const guessWorkflow = await generateGuessWorkflow(userRequest, useCase, sampleWorkflowName);

  if (skipSnapshotPass) {
    return guessWorkflow;
  }

  // Pass 2: Execute with snapshots enabled, then rebuild from snapshots
  try {
    const refined = await refineWorkflowViaSnapshots(guessWorkflow, userRequest, useCase);
    return refined;
  } catch (error: any) {
    console.warn('Snapshot refinement failed, returning guess workflow:', error.message);
    return guessWorkflow;
  }
}

/**
 * Generate a guess workflow using LLM or rule-based generation (Pass 1).
 * Exported for direct use by other tools that need only the guess pass.
 */
export async function generateGuessWorkflow(
  userRequest: string,
  useCase: string,
  sampleWorkflowName?: string
): Promise<Workflow> {
  let sampleWorkflow: Workflow | undefined;
  if (sampleWorkflowName) {
    const example = getWorkflowExample(sampleWorkflowName);
    if (example) {
      sampleWorkflow = example.workflow;
    }
  }

  const llmProvider = getLLMProvider();
  if (llmProvider) {
    try {
      const workflow = await llmProvider.generateWorkflow({
        userRequest,
        useCase,
        sampleWorkflow,
      });

      const validation = WorkflowValidator.validate(workflow);
      if (!validation.valid) {
        throw new Error(`Generated workflow validation failed: ${validation.errors.join(', ')}`);
      }

      return workflow;
    } catch (error: any) {
      console.warn('LLM workflow generation failed, falling back to rule-based:', error.message);
    }
  }

  return generateWorkflowRuleBased(userRequest, useCase, sampleWorkflow);
}

/**
 * Execute a guess workflow with snapshotAllNodes enabled, then rebuild
 * the workflow from the captured accessibility snapshots (Pass 2).
 */
async function refineWorkflowViaSnapshots(
  guessWorkflow: Workflow,
  userRequest: string,
  useCase: string
): Promise<Workflow> {
  // Enable snapshots on the Start node
  const snapshotWorkflow = WorkflowBuilder.enableSnapshotsOnWorkflow(guessWorkflow, 'post');

  // Execute the workflow to generate snapshots
  const executionResult = await executeWorkflow({
    workflow: snapshotWorkflow,
    traceLogs: false,
    recordSession: false,
    waitForCompletion: true,
    pollIntervalMs: 1000,
    maxDurationMs: MAX_EXECUTION_DURATION_MS,
  });

  // Get output directory from execution status
  let outputDirectory: string | undefined;

  if (executionResult.outputDirectory) {
    outputDirectory = executionResult.outputDirectory;
  } else if (executionResult.executionId) {
    // Poll for final status to get outputDirectory
    const backendClient = new BackendClient();
    try {
      const finalStatus = await backendClient.getExecutionStatus(executionResult.executionId);
      outputDirectory = finalStatus.outputDirectory;
    } catch {
      // Ignore -- we'll try alternative discovery below
    }
  }

  if (!outputDirectory) {
    console.warn('Could not determine output directory from execution, returning guess workflow');
    return guessWorkflow;
  }

  const snapshotsPath = path.join(outputDirectory, 'snapshots');

  try {
    const refinedWorkflow = buildWorkflowFromSnapshots(userRequest, useCase, snapshotsPath);
    console.error(`Workflow refined from snapshots at ${snapshotsPath}`);
    return refinedWorkflow;
  } catch (snapshotError: any) {
    console.warn(`Failed to build workflow from snapshots: ${snapshotError.message}`);
    return guessWorkflow;
  }
}

/**
 * Extracts config variable definitions from the user request text.
 * Looks for patterns like "set X to Y", "configure X as Y", "pass X = Y".
 */
function extractConfigVariables(userRequest: string): Record<string, string> {
  const config: Record<string, string> = {};
  const patterns = [
    /(?:set|configure|pass)\s+(\w+)\s*(?:=|to|as)\s*["']?([^"',;.\s]+)["']?/gi,
    /(\w+)\s*=\s*["']?([^"',;.\s]+)["']?/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(userRequest)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      const skipKeys = ['config', 'the', 'it', 'this', 'that', 'them', 'we', 'you', 'browser', 'with', 'set'];
      if (!skipKeys.includes(key.toLowerCase()) && key.length > 1) {
        config[key] = value;
      }
    }
  }
  return config;
}

/**
 * Resolves a natural-language value reference to a config variable interpolation.
 * e.g. "the search term" + configVars { searchTerm: "toys" } -> "${data.searchTerm}"
 */
function resolveConfigReference(
  value: string | undefined,
  configVars: Record<string, string> | undefined
): string | undefined {
  if (!value || !configVars || Object.keys(configVars).length === 0) return value;

  const normalized = value
    .replace(/\b(the|a|an|my|our|this|that)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (normalized.length === 0) return value;

  const camelized =
    normalized[0].toLowerCase() +
    normalized.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');

  for (const key of Object.keys(configVars)) {
    if (key.toLowerCase() === camelized.toLowerCase()) {
      return `\${data.${key}}`;
    }
  }

  // Partial match: check if any config key is a substring of the camelized value or vice-versa
  for (const key of Object.keys(configVars)) {
    if (
      camelized.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(camelized.toLowerCase())
    ) {
      return `\${data.${key}}`;
    }
  }

  return value;
}

function generateWorkflowRuleBased(
  userRequest: string,
  useCase: string,
  sampleWorkflow?: Workflow
): Workflow {
  const builder = new WorkflowBuilder();
  const requestLower = userRequest.toLowerCase();

  // Pre-processing: detect config variables to insert a setConfig node
  const configVars = extractConfigVariables(userRequest);
  const hasConfigKeywords = /\b(?:set\s*config|configure|config|settings)\b/i.test(requestLower);

  // Parse sequential steps if the request is clear
  const steps = RequestAnalyzer.parseSequentialSteps(userRequest);
  
  // If we have parsed steps, use them to build the workflow
  if (steps.length > 0) {
    return generateWorkflowFromSteps(builder, steps, sampleWorkflow, configVars, hasConfigKeywords);
  }

  // Fallback to simple rule-based generation
  const startId = builder.getStartNodeId()!;
  let lastNodeId: string | undefined;

  // Insert setConfig if config detected
  if (hasConfigKeywords || Object.keys(configVars).length > 0) {
    const configId = builder.addSetConfigNode(
      Object.keys(configVars).length > 0 ? configVars : { key: 'value' },
      'Set Config'
    );
    builder.connectNodes(startId, configId);
    lastNodeId = configId;
  }

  // Check if it's a browser automation workflow
  if (
    requestLower.includes('browser') ||
    requestLower.includes('navigate') ||
    requestLower.includes('click') ||
    requestLower.includes('type') ||
    requestLower.includes('form') ||
    /https?:\/\//.test(userRequest)
  ) {
    const browserId = builder.addNode(NodeType.OPEN_BROWSER, {
      label: 'Open Browser',
      headless: false,
      browser: 'chromium',
      viewportWidth: 1280,
      viewportHeight: 720,
    });

    builder.connectNodes(lastNodeId || startId, browserId);
    lastNodeId = browserId;

    const urlMatch = userRequest.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const navId = builder.addNode(NodeType.NAVIGATION, {
        label: 'Navigate',
        action: 'navigate',
        url: urlMatch[0],
        waitUntil: 'networkidle',
      });
      builder.connectNodes(lastNodeId, navId);
      
      const waitAfterNavId = builder.addNode(NodeType.WAIT, {
        label: 'Wait after navigation',
        waitType: 'timeout',
        value: String(WAIT_AFTER_CLICK_MS),
        timeout: WAIT_AFTER_CLICK_MS,
      });
      builder.connectNodes(navId, waitAfterNavId);
      lastNodeId = waitAfterNavId;
    }

    if (requestLower.includes('click')) {
      const clickId = builder.addNode(NodeType.ACTION, {
        label: 'Click',
        action: 'click',
        selector: inferSelector(requestLower),
      });
      builder.connectNodes(lastNodeId!, clickId);
      
      const waitAfterClickId = builder.addNode(NodeType.WAIT, {
        label: 'Wait after click',
        waitType: 'timeout',
        value: String(WAIT_AFTER_CLICK_MS),
        timeout: WAIT_AFTER_CLICK_MS,
      });
      builder.connectNodes(clickId, waitAfterClickId);
      lastNodeId = waitAfterClickId;
    }

    if (requestLower.includes('type') || requestLower.includes('input') || requestLower.includes('fill')) {
      const typeId = builder.addNode(NodeType.TYPE, {
        label: 'Type',
        selector: 'input',
        text: 'text',
        clearFirst: true,
      });
      builder.connectNodes(lastNodeId!, typeId);
      lastNodeId = typeId;
    }

    // Detect extraction intent
    if (/\b(?:extract|scrape|get\s+(?:text|data|names?|titles?|prices?))\b/i.test(requestLower)) {
      const extractId = builder.addJavaScriptNode(
        'const items = await context.page.locator("h2").allTextContents();\ncontext.setData("extractedItems", items);',
        'Extract Data'
      );
      builder.connectNodes(lastNodeId!, extractId);
      lastNodeId = extractId;
    }

    // Detect verification intent
    if (/\b(?:verify|assert|check|confirm|validate|ensure)\b/i.test(requestLower)) {
      const verifyId = builder.addVerifyNode('browser', 'visible', {
        selector: 'body',
      }, 'Verify');
      builder.connectNodes(lastNodeId!, verifyId);
      lastNodeId = verifyId;
    }

  } else if (requestLower.includes('api') || requestLower.includes('http')) {
    const apiId = builder.addNode(NodeType.API_REQUEST, {
      label: 'API Request',
      method: 'GET',
      url: 'https://api.example.com',
      contextKey: 'apiResponse',
    });

    builder.connectNodes(lastNodeId || startId, apiId);
    lastNodeId = apiId;
  }

  // Check for plugin node types in the request
  const pluginNode = findPluginNodeByKeyword(requestLower);
  if (pluginNode && !hasConfigKeywords) {
    const pluginId = builder.addNode(pluginNode.type, {
      label: pluginNode.label,
      ...(pluginNode.defaultData || {}),
    });
    builder.connectNodes(lastNodeId || startId, pluginId);
    lastNodeId = pluginId;
  }

  if (sampleWorkflow) {
    return adaptSampleWorkflow(sampleWorkflow, userRequest);
  }

  return builder.build();
}

function generateWorkflowFromSteps(
  builder: WorkflowBuilder,
  steps: import('../utils/requestAnalyzer.js').ParsedStep[],
  sampleWorkflow?: Workflow,
  configVars?: Record<string, string>,
  hasConfigKeywords?: boolean
): Workflow {
  const startId = builder.getStartNodeId()!;
  let lastNodeId: string | undefined;

  // Insert setConfig node first if config detected
  if ((hasConfigKeywords || (configVars && Object.keys(configVars).length > 0)) &&
      !steps.some(s => s.action === 'setConfig')) {
    const configId = builder.addSetConfigNode(
      configVars && Object.keys(configVars).length > 0 ? configVars : { key: 'value' },
      'Set Config'
    );
    builder.connectNodes(startId, configId);
    lastNodeId = configId;
  }
  
  // Add Open Browser node first if we have browser actions
  const hasBrowserActions = steps.some(s => 
    s.action === 'navigate' || s.action === 'click' || s.action === 'type' ||
    s.action === 'fill' || s.action === 'extract' || s.action === 'verify' ||
    s.action === 'keyboard'
  );
  
  if (hasBrowserActions) {
    const browserId = builder.addNode(NodeType.OPEN_BROWSER, {
      label: 'Open Browser',
      headless: false,
      browser: 'chromium',
      viewportWidth: 1280,
      viewportHeight: 720,
    });
    
    builder.connectNodes(lastNodeId || startId, browserId);
    lastNodeId = browserId;
  }

  // Track loop state for proper edge wiring
  let activeLoopId: string | undefined;
  let loopFinalized = false;
  const loopBodyNodeIds: string[] = [];
  let lastExtractVariable: string | undefined;

  for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
    let step = steps[stepIdx];
    let currentNodeId: string | undefined;

    // When a post-loop step arrives, finalize the loop body first
    if (activeLoopId && step.isPostLoop && !loopFinalized) {
      if (loopBodyNodeIds.length > 0) {
        builder.addLoopBody(activeLoopId, loopBodyNodeIds);
        loopBodyNodeIds.length = 0;
      }
      loopFinalized = true;
    }

    // Track extract variables for smart verify generation
    if (step.action === 'extract') {
      lastExtractVariable = step.outputVariable || 'extractedData';
    }

    // Resolve config references in type/fill values before handing to nodeFactory
    if ((step.action === 'type' || step.action === 'fill') && step.value && configVars) {
      const resolved = resolveConfigReference(step.value, configVars);
      if (resolved && resolved !== step.value) {
        step = { ...step, value: resolved };
      }
    }

    // Merge config vars into setConfig entries
    if (step.action === 'setConfig' && configVars && Object.keys(configVars).length > 0) {
      step = {
        ...step,
        configEntries: { ...(configVars || {}), ...(step.configEntries || {}) },
      };
    }

    // Loop needs special handling for builder wiring (addLoopBody, addPostLoopConnection)
    if (step.action === 'loop') {
      if (activeLoopId && loopBodyNodeIds.length > 0) {
        builder.addLoopBody(activeLoopId, loopBodyNodeIds);
        loopBodyNodeIds.length = 0;
      }

      const nodeConfig = buildNodeConfig(step, null, lastExtractVariable);
      if (nodeConfig) {
        const loopData = nodeConfig.data;
        const loopId = builder.addLoopNode(
          loopData.loopMode || 'doWhile',
          {
            arrayVariable: loopData.arrayVariable,
            condition: loopData.condition,
          },
          loopData.label
        );
        activeLoopId = loopId;
        loopFinalized = false;
        currentNodeId = loopId;
      }
    } else {
      // All other actions: delegate to the common node factory
      const selectorInfo: SelectorInfo | null = step.target
        ? { selector: inferSelector(step.target), selectorType: 'css' }
        : null;

      const nodeConfig = buildNodeConfig(step, selectorInfo, lastExtractVariable);
      if (nodeConfig) {
        currentNodeId = builder.addNode(nodeConfig.type, nodeConfig.data);
      }
    }

    // Wire up edges
    if (currentNodeId) {
      const isInLoopBody = activeLoopId && !loopFinalized && currentNodeId !== activeLoopId;

      if (isInLoopBody) {
        loopBodyNodeIds.push(currentNodeId);
      } else if (loopFinalized && activeLoopId) {
        builder.addPostLoopConnection(activeLoopId, currentNodeId);
        activeLoopId = undefined;
        loopFinalized = false;
      } else if (lastNodeId) {
        builder.connectNodes(lastNodeId, currentNodeId);
      } else {
        builder.connectNodes(startId, currentNodeId);
      }

      // Auto-insert wait after navigation and click, unless next step is an explicit wait
      const nextStep = stepIdx + 1 < steps.length ? steps[stepIdx + 1] : undefined;
      const nextIsWait = nextStep?.action === 'wait';
      if ((step.action === 'navigate' || step.action === 'click') && !nextIsWait) {
        const waitId = builder.addNode(NodeType.WAIT, {
          label: `Wait after ${step.action}`,
          waitType: 'timeout',
          value: String(WAIT_AFTER_CLICK_MS),
          timeout: WAIT_AFTER_CLICK_MS,
        });
        if (isInLoopBody) {
          loopBodyNodeIds.push(waitId);
        } else {
          builder.connectNodes(currentNodeId, waitId);
        }
        lastNodeId = waitId;
      } else {
        lastNodeId = currentNodeId;
      }
    }
  }

  // Finalize any remaining loop body
  if (activeLoopId && loopBodyNodeIds.length > 0) {
    builder.addLoopBody(activeLoopId, loopBodyNodeIds);
    loopBodyNodeIds.length = 0;
  }

  return builder.build();
}

function inferSelector(target?: string): string {
  if (!target) return 'button';
  
  const targetLower = target.toLowerCase();
  
  // Common patterns
  if (targetLower.includes('button')) return 'button';
  if (targetLower.includes('link')) return 'a';
  if (targetLower.includes('input') || targetLower.includes('field')) return 'input';
  if (targetLower.includes('form')) return 'form';
  if (targetLower.includes('search')) return 'input[type="search"], input[name*="search"], input#twotabsearchtextbox';
  if (targetLower.includes('login') || targetLower.includes('sign in')) return 'a[href*="login"], button:has-text("Login")';
  if (targetLower.includes('register') || targetLower.includes('sign up')) return 'a[href*="register"], button:has-text("Register")';
  if (targetLower.includes('add to cart') || targetLower.includes('add to basket')) return 'button:has-text("Add to Cart"), button:has-text("Add to Basket"), #add-to-cart-button';
  if (targetLower.includes('cart') || targetLower.includes('basket')) return 'a[href*="cart"], #nav-cart';
  if (targetLower.includes('product') || targetLower.includes('item')) return '.s-result-item h2 a, .product-title a';
  if (targetLower.includes('next') || targetLower.includes('pagination')) return 'a.s-pagination-next, button:has-text("Next")';
  
  // Try to extract from common patterns
  const hrefMatch = target.match(/href[=:]\s*["']([^"']+)["']/);
  if (hrefMatch) return `a[href*="${hrefMatch[1]}"]`;
  
  // If target looks like a selector already (contains CSS-like syntax), use it directly
  if (/[.#\[\]:>+~]/.test(target)) return target;
  
  // Try text-based selector
  if (/^[a-zA-Z\s]+$/.test(target.trim())) {
    return `button:has-text("${target.trim()}"), a:has-text("${target.trim()}")`;
  }
  
  return target;
}

function adaptSampleWorkflow(sampleWorkflow: Workflow, userRequest: string): Workflow {
  // Create a copy and update labels based on user request
  const adapted: Workflow = {
    nodes: sampleWorkflow.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        label: (node.data as any).label || node.type,
      },
    })),
    edges: [...sampleWorkflow.edges],
  };

  return adapted;
}
