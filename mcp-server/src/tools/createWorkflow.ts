import { Workflow, NodeType } from '@automflows/shared';
import { getLLMProvider } from '../llm/index.js';
import { WorkflowBuilder } from '../utils/workflowBuilder.js';
import { WorkflowValidator } from '../utils/workflowValidator.js';
import { getWorkflowExample } from '../resources/workflowExamples.js';
import { RequestAnalyzer } from '../utils/requestAnalyzer.js';
import { findPluginNodeByKeyword } from '../resources/nodeDocumentation.js';

export interface CreateWorkflowParams {
  userRequest: string;
  useCase: string;
  sampleWorkflowName?: string;
}

export interface CreateWorkflowResult {
  workflow?: Workflow;
  needsClarification?: boolean;
  clarificationQuestions?: string[];
}

export async function createWorkflow(params: CreateWorkflowParams): Promise<CreateWorkflowResult | Workflow> {
  const { userRequest, useCase, sampleWorkflowName } = params;

  // Analyze request clarity
  const clarity = RequestAnalyzer.analyzeClarity(userRequest);
  
  // If request is unclear, return clarification questions
  if (!clarity.isClear && clarity.clarificationQuestions && clarity.clarificationQuestions.length > 0) {
    return {
      needsClarification: true,
      clarificationQuestions: clarity.clarificationQuestions,
    };
  }

  // Try to get sample workflow if provided
  let sampleWorkflow: Workflow | undefined;
  if (sampleWorkflowName) {
    const example = getWorkflowExample(sampleWorkflowName);
    if (example) {
      sampleWorkflow = example.workflow;
    }
  }

  // Try LLM generation first
  const llmProvider = getLLMProvider();
  if (llmProvider) {
    try {
      const workflow = await llmProvider.generateWorkflow({
        userRequest,
        useCase,
        sampleWorkflow,
      });

      // Validate the generated workflow
      const validation = WorkflowValidator.validate(workflow);
      if (!validation.valid) {
        throw new Error(`Generated workflow validation failed: ${validation.errors.join(', ')}`);
      }

      return workflow;
    } catch (error: any) {
      console.warn('LLM workflow generation failed, falling back to rule-based:', error.message);
      // Fall through to rule-based generation
    }
  }

  // Fallback to rule-based generation
  return generateWorkflowRuleBased(userRequest, useCase, sampleWorkflow);
}

/**
 * Extracts config variable definitions from the user request text.
 * Looks for patterns like "set X to Y", "configure X as Y", "pass X = Y".
 */
function extractConfigVariables(userRequest: string): Record<string, string> {
  const config: Record<string, string> = {};
  const patterns = [
    /(?:set|configure|pass)\s+(\w+)\s*(?:=|to|as)\s*["']?([^"',;.]+)["']?/gi,
    /(\w+)\s*=\s*["']?([^"',;.]+)["']?/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(userRequest)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      const skipKeys = ['config', 'the', 'it', 'this', 'that', 'them', 'we', 'you', 'browser'];
      if (!skipKeys.includes(key.toLowerCase()) && key.length > 1) {
        config[key] = value;
      }
    }
  }
  return config;
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
        timeout: 2000,
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
        timeout: 2000,
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
    s.action === 'fill' || s.action === 'extract' || s.action === 'verify'
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
  const loopBodyNodeIds: string[] = [];

  for (const step of steps) {
    let currentNodeId: string | undefined;

    switch (step.action) {
      case 'setConfig': {
        const config = step.configEntries || configVars || { key: 'value' };
        currentNodeId = builder.addSetConfigNode(config, 'Set Config');
        break;
      }

      case 'navigate':
        if (step.target) {
          currentNodeId = builder.addNode(NodeType.NAVIGATION, {
            label: `Navigate to ${step.target}`,
            action: 'navigate',
            url: step.target,
            waitUntil: 'networkidle',
          });
        }
        break;

      case 'click':
        currentNodeId = builder.addNode(NodeType.ACTION, {
          label: `Click ${step.target || 'element'}`,
          action: 'click',
          selector: inferSelector(step.target),
        });
        break;

      case 'type':
        currentNodeId = builder.addNode(NodeType.TYPE, {
          label: `Type ${step.value || 'text'}`,
          selector: inferSelector(step.target),
          text: step.value || '',
          clearFirst: true,
        });
        break;

      case 'fill':
        currentNodeId = builder.addNode(NodeType.TYPE, {
          label: 'Fill form',
          selector: 'form input',
          text: 'dummy data',
          clearFirst: true,
        });
        break;

      case 'wait': {
        const waitTime = step.value ? parseInt(step.value, 10) * 1000 : 1000;
        currentNodeId = builder.addNode(NodeType.WAIT, {
          label: `Wait ${step.value || '1'}s`,
          timeout: waitTime,
        });
        break;
      }

      case 'submit':
        currentNodeId = builder.addNode(NodeType.ACTION, {
          label: 'Submit form',
          action: 'click',
          selector: 'button[type="submit"], input[type="submit"]',
        });
        break;

      case 'loop': {
        // If there's an active loop pending, finalize it first
        if (activeLoopId && loopBodyNodeIds.length > 0) {
          builder.addLoopBody(activeLoopId, loopBodyNodeIds);
          loopBodyNodeIds.length = 0;
        }

        const loopId = builder.addLoopNode(
          step.loopVariable ? 'forEach' : 'doWhile',
          {
            arrayVariable: step.loopVariable,
            condition: step.loopCount ? `index < ${step.loopCount}` : undefined,
          },
          `Loop${step.loopVariable ? ` over ${step.loopVariable}` : ''}`
        );
        activeLoopId = loopId;
        currentNodeId = loopId;
        break;
      }

      case 'extract': {
        const code = step.target
          ? `const el = context.page.locator(${JSON.stringify(step.target)});\nconst text = await el.textContent();\ncontext.setData("extractedText", text);`
          : 'const items = await context.page.locator("h2").allTextContents();\ncontext.setData("extractedItems", items);';
        currentNodeId = builder.addJavaScriptNode(code, 'Extract Data');
        break;
      }

      case 'verify': {
        currentNodeId = builder.addVerifyNode('browser', 'visible', {
          selector: 'body',
        }, `Verify: ${step.description.substring(0, 40)}`);
        break;
      }

      case 'code': {
        currentNodeId = builder.addJavaScriptNode(
          `// ${step.description}\n// Add your JavaScript code here\n// Available: context.page, context.getData(), context.setData()`,
          step.description.substring(0, 40)
        );
        break;
      }

      case 'unknown': {
        // Try to match against plugin node types
        const pluginNode = findPluginNodeByKeyword(step.description.toLowerCase());
        if (pluginNode) {
          currentNodeId = builder.addNode(pluginNode.type, {
            label: pluginNode.label,
            ...(pluginNode.defaultData || {}),
          });
        }
        break;
      }
    }

    // Wire up edges
    if (currentNodeId) {
      if (activeLoopId && currentNodeId !== activeLoopId) {
        // This node is part of the loop body
        loopBodyNodeIds.push(currentNodeId);
      } else if (lastNodeId) {
        builder.connectNodes(lastNodeId, currentNodeId);
      } else {
        builder.connectNodes(startId, currentNodeId);
      }

      // Auto-insert wait after navigation and click
      if (step.action === 'navigate' || step.action === 'click') {
        const waitId = builder.addNode(NodeType.WAIT, {
          label: `Wait after ${step.action}`,
          timeout: 2000,
        });
        if (activeLoopId && currentNodeId !== activeLoopId) {
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
    // The next node after the loop should be wired from loopComplete
    // For now, make lastNodeId the loopId so the caller can connect post-loop nodes
    lastNodeId = activeLoopId;
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
