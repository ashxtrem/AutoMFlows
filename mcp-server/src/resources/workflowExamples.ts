import * as fs from 'fs';
import * as path from 'path';
import { Workflow } from '@automflows/shared';
import { getConfig } from '../config.js';

export interface WorkflowExample {
  name: string;
  description: string;
  workflow: Workflow;
  useCase: string;
}

let cachedExamples: WorkflowExample[] | null = null;

export function loadWorkflowExamples(): WorkflowExample[] {
  if (cachedExamples) {
    return cachedExamples;
  }

  const config = getConfig();
  const workflowsPath = config.workflowsPath;
  const examples: WorkflowExample[] = [];

  if (!fs.existsSync(workflowsPath)) {
    console.warn(`Workflows path does not exist: ${workflowsPath}`);
    return examples;
  }

  const files = fs.readdirSync(workflowsPath);
  
  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(workflowsPath, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const workflow = JSON.parse(content) as Workflow;
      
      // Extract use case from filename or workflow structure
      const useCase = inferUseCase(file, workflow);
      
      examples.push({
        name: file.replace('.json', ''),
        description: `Example workflow: ${useCase}`,
        workflow,
        useCase,
      });
    } catch (error) {
      console.warn(`Failed to load workflow ${file}:`, error);
    }
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
  })), null, 2);
}
