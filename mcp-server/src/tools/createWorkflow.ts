import { Workflow } from '@automflows/shared';
import { getLLMProvider } from '../llm/index.js';
import { WorkflowBuilder } from '../utils/workflowBuilder.js';
import { WorkflowValidator } from '../utils/workflowValidator.js';
import { getWorkflowExample } from '../resources/workflowExamples.js';
import { RequestAnalyzer } from '../utils/requestAnalyzer.js';

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

function generateWorkflowRuleBased(
  userRequest: string,
  useCase: string,
  sampleWorkflow?: Workflow
): Workflow {
  const builder = new WorkflowBuilder();
  const requestLower = userRequest.toLowerCase();

  // Parse sequential steps if the request is clear
  const steps = RequestAnalyzer.parseSequentialSteps(userRequest);
  
  // If we have parsed steps, use them to build the workflow
  if (steps.length > 0) {
    return generateWorkflowFromSteps(builder, steps, sampleWorkflow);
  }

  // Fallback to simple rule-based generation
  // Check if it's a browser automation workflow
  if (
    requestLower.includes('browser') ||
    requestLower.includes('navigate') ||
    requestLower.includes('click') ||
    requestLower.includes('type') ||
    requestLower.includes('form')
  ) {
    // Add Open Browser node
    const browserId = builder.addNode('openBrowser', {
      label: 'Open Browser',
      headless: false,
      browser: 'chromium',
      viewportWidth: 1280,
      viewportHeight: 720,
    });

    const startId = builder.getStartNodeId()!;
    builder.connectNodes(startId, browserId);

    // Add Navigation node if URL is mentioned
    const urlMatch = userRequest.match(/https?:\/\/[^\s]+/);
    let lastNodeId: string | undefined = browserId;
    if (urlMatch) {
      const navId = builder.addNode('navigation', {
        label: 'Navigate',
        action: 'navigate',
        url: urlMatch[0],
        waitUntil: 'networkidle',
      });
      builder.connectNodes(browserId, navId);
      
      // Automatically add wait node after navigation
      const waitAfterNavId = builder.addNode('wait', {
        label: 'Wait after navigation',
        timeout: 2000,
      });
      builder.connectNodes(navId, waitAfterNavId);
      lastNodeId = waitAfterNavId;
    }

    // Add basic interaction nodes based on keywords
    if (requestLower.includes('click')) {
      const clickId = builder.addNode('action', {
        label: 'Click',
        action: 'click',
        selector: 'button', // Placeholder - should be extracted from request
      });
      if (lastNodeId) {
        builder.connectNodes(lastNodeId, clickId);
      }
      
      // Automatically add wait node after click
      const waitAfterClickId = builder.addNode('wait', {
        label: 'Wait after click',
        timeout: 2000,
      });
      builder.connectNodes(clickId, waitAfterClickId);
      lastNodeId = waitAfterClickId;
    }

    if (requestLower.includes('type') || requestLower.includes('input') || requestLower.includes('fill')) {
      const typeId = builder.addNode('type', {
        label: 'Type',
        selector: 'input',
        text: 'text', // Placeholder
        clearFirst: true,
      });
      if (lastNodeId) {
        builder.connectNodes(lastNodeId, typeId);
      }
      lastNodeId = typeId;
    }
  } else if (requestLower.includes('api') || requestLower.includes('http')) {
    // API workflow
    const apiId = builder.addNode('apiRequest', {
      label: 'API Request',
      method: 'GET',
      url: 'https://api.example.com', // Placeholder
      contextKey: 'apiResponse',
    });

    const startId = builder.getStartNodeId()!;
    builder.connectNodes(startId, apiId);
  }

  // If we have a sample workflow, try to adapt it
  if (sampleWorkflow) {
    // Simple adaptation: use the structure but update labels
    return adaptSampleWorkflow(sampleWorkflow, userRequest);
  }

  return builder.build();
}

function generateWorkflowFromSteps(
  builder: WorkflowBuilder,
  steps: import('../utils/requestAnalyzer.js').ParsedStep[],
  sampleWorkflow?: Workflow
): Workflow {
  let lastNodeId: string | undefined;
  
  // Add Open Browser node first if we have browser actions
  const hasBrowserActions = steps.some(s => 
    s.action === 'navigate' || s.action === 'click' || s.action === 'type' || s.action === 'fill'
  );
  
  if (hasBrowserActions) {
    const browserId = builder.addNode('openBrowser', {
      label: 'Open Browser',
      headless: false,
      browser: 'chromium',
      viewportWidth: 1280,
      viewportHeight: 720,
    });
    
    const startId = builder.getStartNodeId()!;
    builder.connectNodes(startId, browserId);
    lastNodeId = browserId;
  }

  // Process each step
  for (const step of steps) {
    let currentNodeId: string | undefined;

    switch (step.action) {
      case 'navigate':
        if (step.target) {
          currentNodeId = builder.addNode('navigation', {
            label: `Navigate to ${step.target}`,
            action: 'navigate',
            url: step.target,
            waitUntil: 'networkidle',
          });
        }
        break;

      case 'click':
        currentNodeId = builder.addNode('action', {
          label: `Click ${step.target || 'element'}`,
          action: 'click',
          selector: inferSelector(step.target),
        });
        break;

      case 'type':
        currentNodeId = builder.addNode('type', {
          label: `Type ${step.value || 'text'}`,
          selector: inferSelector(step.target),
          text: step.value || '',
          clearFirst: true,
        });
        break;

      case 'fill':
        currentNodeId = builder.addNode('type', {
          label: 'Fill form',
          selector: 'form input',
          text: 'dummy data',
          clearFirst: true,
        });
        break;

      case 'wait':
        const waitTime = step.value ? parseInt(step.value, 10) * 1000 : 1000;
        currentNodeId = builder.addNode('wait', {
          label: `Wait ${step.value || '1'}s`,
          timeout: waitTime,
        });
        break;

      case 'submit':
        currentNodeId = builder.addNode('action', {
          label: 'Submit form',
          action: 'click',
          selector: 'button[type="submit"], input[type="submit"]',
        });
        break;
    }

    // Connect to previous node
    if (currentNodeId && lastNodeId) {
      builder.connectNodes(lastNodeId, currentNodeId);
      
      // Automatically insert wait node after navigation and click operations
      if (step.action === 'navigate' || step.action === 'click') {
        const waitId = builder.addNode('wait', {
          label: `Wait after ${step.action}`,
          timeout: 2000, // 2 seconds default wait
        });
        builder.connectNodes(currentNodeId, waitId);
        lastNodeId = waitId;
      } else {
        lastNodeId = currentNodeId;
      }
    } else if (currentNodeId) {
      lastNodeId = currentNodeId;
    }
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
  if (targetLower.includes('search')) return 'input[type="search"], input[name*="search"]';
  if (targetLower.includes('login') || targetLower.includes('sign in')) return 'a[href*="login"], button:has-text("Login")';
  if (targetLower.includes('register') || targetLower.includes('sign up')) return 'a[href*="register"], button:has-text("Register")';
  if (targetLower.includes('cart') || targetLower.includes('basket')) return 'button:has-text("Add to Cart"), button:has-text("Add to Basket")';
  
  // Try to extract from common patterns
  const hrefMatch = target.match(/href[=:]\s*["']([^"']+)["']/);
  if (hrefMatch) return `a[href*="${hrefMatch[1]}"]`;
  
  return target; // Use target as selector if no pattern matches
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
