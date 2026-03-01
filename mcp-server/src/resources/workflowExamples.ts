import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Workflow, NodeType } from '@automflows/shared';
import { getConfig } from '../config.js';

export interface WorkflowExample {
  name: string;
  description: string;
  workflow: Workflow;
  useCase: string;
}

let cachedExamples: WorkflowExample[] | null = null;

/**
 * Resolve the workflows directory using multiple strategies so that examples
 * load regardless of which directory the process was started from.
 */
function resolveWorkflowsDir(): string {
  const config = getConfig();
  const configPath = config.workflowsPath;

  // 1. If the configured path exists, use it
  if (fs.existsSync(configPath)) {
    return configPath;
  }

  // 2. Try resolving relative to the package root (mcp-server/../tests/workflows/demo)
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const packageRoot = path.resolve(path.dirname(thisFile), '..', '..');
    const projectRoot = path.resolve(packageRoot, '..');
    const candidate = path.join(projectRoot, 'tests', 'workflows', 'demo');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // import.meta.url may not be available in all environments
  }

  // 3. Return configured path as-is (will be handled by caller)
  return configPath;
}

export function loadWorkflowExamples(): WorkflowExample[] {
  if (cachedExamples) {
    return cachedExamples;
  }

  const workflowsPath = resolveWorkflowsDir();
  const examples: WorkflowExample[] = [];

  if (!fs.existsSync(workflowsPath)) {
    console.warn(
      `[workflowExamples] Workflows path does not exist: ${workflowsPath} ` +
      `(cwd: ${process.cwd()}). Returning fallback examples.`
    );
    cachedExamples = getFallbackExamples();
    return cachedExamples;
  }

  let files: string[];
  try {
    files = fs.readdirSync(workflowsPath);
  } catch (error) {
    console.error(`[workflowExamples] Failed to read directory ${workflowsPath}:`, error);
    cachedExamples = getFallbackExamples();
    return cachedExamples;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(workflowsPath, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const workflow = JSON.parse(content) as Workflow;
      
      const useCase = inferUseCase(file, workflow);
      
      examples.push({
        name: workflow.metadata?.name || file.replace('.json', ''),
        description: workflow.metadata?.description || `Example workflow: ${useCase}`,
        workflow,
        useCase,
      });
    } catch (error) {
      console.warn(`[workflowExamples] Failed to load workflow ${file}:`, error);
    }
  }

  // If no examples loaded from disk, include fallbacks
  if (examples.length === 0) {
    console.warn('[workflowExamples] No workflow files loaded from disk, using fallback examples.');
    cachedExamples = getFallbackExamples();
    return cachedExamples;
  }

  cachedExamples = examples;
  return examples;
}

function inferUseCase(filename: string, workflow: Workflow): string {
  // Try to infer use case from filename
  const filenameLower = filename.toLowerCase();
  
  if (filenameLower.includes('login')) {
    return 'User login automation';
  }
  if (filenameLower.includes('api')) {
    return 'API testing workflow';
  }
  if (filenameLower.includes('form')) {
    return 'Form filling automation';
  }
  if (filenameLower.includes('marketplace')) {
    return 'Marketplace interaction workflow';
  }
  if (filenameLower.includes('test')) {
    return 'Test automation workflow';
  }

  // Try to infer from workflow structure
  const nodeTypes = workflow.nodes.map(n => n.type);
  if (nodeTypes.includes('openBrowser') && nodeTypes.includes('navigation')) {
    return 'Browser automation workflow';
  }
  if (nodeTypes.includes('apiRequest') || nodeTypes.includes('apiCurl')) {
    return 'API workflow';
  }

  return 'General automation workflow';
}

export function getWorkflowExample(name: string): WorkflowExample | null {
  const examples = loadWorkflowExamples();
  return examples.find(e => e.name === name) || null;
}

export function getWorkflowExamplesAsResource(): string {
  const examples = loadWorkflowExamples();
  return JSON.stringify(examples.map(e => ({
    name: e.name,
    description: e.description,
    useCase: e.useCase,
    nodeCount: e.workflow.nodes.length,
    edgeCount: e.workflow.edges.length,
    metadata: e.workflow.metadata,
  })), null, 2);
}

/**
 * Hardcoded fallback examples so the resource is never empty.
 * These represent common workflow patterns and serve as reference for AI agents.
 */
function getFallbackExamples(): WorkflowExample[] {
  return [
    {
      name: 'simple-browser-automation',
      description: 'Navigate to a website and extract page title. Demonstrates: Start, Open Browser, Navigation, JavaScript Code.',
      useCase: 'Browser automation workflow',
      workflow: {
        nodes: [
          { id: 'start', type: NodeType.START, position: { x: 100, y: 200 }, data: { type: NodeType.START, label: 'Start' } },
          { id: 'browser', type: NodeType.OPEN_BROWSER, position: { x: 400, y: 200 }, data: { type: NodeType.OPEN_BROWSER, label: 'Open Browser', headless: false, browser: 'chromium' } },
          { id: 'nav', type: NodeType.NAVIGATION, position: { x: 700, y: 200 }, data: { type: NodeType.NAVIGATION, label: 'Navigate', action: 'navigate', url: 'https://example.com', waitUntil: 'networkidle' } },
          { id: 'extract', type: NodeType.JAVASCRIPT_CODE, position: { x: 1000, y: 200 }, data: { type: NodeType.JAVASCRIPT_CODE, label: 'Extract Title', code: 'const title = await context.page.title();\ncontext.setData("pageTitle", title);\nconsole.log("Page title:", title);' } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'browser', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e2', source: 'browser', target: 'nav', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e3', source: 'nav', target: 'extract', sourceHandle: 'output', targetHandle: 'input' },
        ],
      },
    },
    {
      name: 'config-driven-search',
      description: 'Use setConfig to define search parameters, navigate, search, and extract results. Demonstrates: setConfig plugin, variable interpolation (${data.key}), loops, and JavaScript code.',
      useCase: 'E-commerce search automation',
      workflow: {
        nodes: [
          { id: 'start', type: NodeType.START, position: { x: 100, y: 200 }, data: { type: NodeType.START, label: 'Start' } },
          { id: 'config', type: 'setConfig.setConfig' as any, position: { x: 400, y: 200 }, data: { type: 'setConfig.setConfig', label: 'Set Config', config: { searchTerm: 'toys', maxResults: '3' } } },
          { id: 'browser', type: NodeType.OPEN_BROWSER, position: { x: 700, y: 200 }, data: { type: NodeType.OPEN_BROWSER, label: 'Open Browser', headless: false, browser: 'chromium' } },
          { id: 'nav', type: NodeType.NAVIGATION, position: { x: 1000, y: 200 }, data: { type: NodeType.NAVIGATION, label: 'Navigate', action: 'navigate', url: 'https://www.example.com', waitUntil: 'networkidle' } },
          { id: 'type-search', type: NodeType.TYPE, position: { x: 1300, y: 200 }, data: { type: NodeType.TYPE, label: 'Search', selector: 'input[name="search"]', text: '${data.searchTerm}', clearFirst: true } },
          { id: 'js-extract', type: NodeType.JAVASCRIPT_CODE, position: { x: 1600, y: 200 }, data: { type: NodeType.JAVASCRIPT_CODE, label: 'Extract Results', code: 'const max = context.getData("maxResults") || 3;\nconst titles = await context.page.locator("h2").allTextContents();\ncontext.setData("results", titles.slice(0, max));' } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'config', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e2', source: 'config', target: 'browser', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e3', source: 'browser', target: 'nav', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e4', source: 'nav', target: 'type-search', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e5', source: 'type-search', target: 'js-extract', sourceHandle: 'output', targetHandle: 'input' },
        ],
      },
    },
    {
      name: 'loop-with-verification',
      description: 'Demonstrates loop node edge patterns: body nodes connected from "output" handle, post-loop node connected from "loopComplete" handle. No back-edges to loop.',
      useCase: 'Loop pattern reference',
      workflow: {
        nodes: [
          { id: 'start', type: NodeType.START, position: { x: 100, y: 200 }, data: { type: NodeType.START, label: 'Start' } },
          { id: 'js-init', type: NodeType.JAVASCRIPT_CODE, position: { x: 400, y: 200 }, data: { type: NodeType.JAVASCRIPT_CODE, label: 'Init Array', code: 'context.setVariable("items", ["item1", "item2", "item3"]);' } },
          { id: 'loop', type: NodeType.LOOP, position: { x: 700, y: 200 }, data: { type: NodeType.LOOP, label: 'Loop Items', loopMode: 'forEach', arrayVariable: 'items' } },
          { id: 'body-log', type: NodeType.JAVASCRIPT_CODE, position: { x: 1000, y: 200 }, data: { type: NodeType.JAVASCRIPT_CODE, label: 'Process Item', code: 'const item = context.getVariable("item");\nconst index = context.getVariable("index");\nconsole.log(`Processing ${index}: ${item}`);' } },
          { id: 'post-loop', type: NodeType.JAVASCRIPT_CODE, position: { x: 700, y: 450 }, data: { type: NodeType.JAVASCRIPT_CODE, label: 'After Loop', code: 'console.log("Loop complete!");' } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'js-init', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e2', source: 'js-init', target: 'loop', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e3', source: 'loop', target: 'body-log', sourceHandle: 'output', targetHandle: 'input' },
          { id: 'e4', source: 'loop', target: 'post-loop', sourceHandle: 'loopComplete', targetHandle: 'input' },
        ],
      },
    },
  ];
}
