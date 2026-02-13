import { OpenAIClient, WorkflowGenerationRequest } from './openai.js';
import { LocalLLMClient } from './localLLM.js';
import { Workflow } from '@automflows/shared';
import { getConfig } from '../config.js';

export interface LLMProvider {
  isAvailable(): boolean;
  generateWorkflow(request: WorkflowGenerationRequest): Promise<Workflow>;
  analyzeAndFixWorkflow(workflow: Workflow, errorMessage: string, executionLogs?: string[]): Promise<Workflow>;
  extendWorkflow(workflow: Workflow, userRequest: string, modificationType?: string): Promise<Workflow>;
}

export function getLLMProvider(): LLMProvider | null {
  const config = getConfig();
  
  switch (config.llm.provider) {
    case 'openai':
      const openaiClient = new OpenAIClient();
      return openaiClient.isAvailable() ? openaiClient : null;
    
    case 'local':
      const localClient = new LocalLLMClient();
      return localClient.isAvailable() ? localClient : null;
    
    case 'none':
    default:
      return null;
  }
}

export { OpenAIClient, LocalLLMClient };
