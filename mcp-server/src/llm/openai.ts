import OpenAI from 'openai';
import { getConfig } from '../config.js';
import { Workflow } from '@automflows/shared';
import { getNodeDocumentationAsResource } from '../resources/nodeDocumentation.js';
import { getWorkflowExamplesAsResource } from '../resources/workflowExamples.js';
import { getProjectContextAsResource } from '../resources/projectContext.js';

export interface WorkflowGenerationRequest {
  userRequest: string;
  useCase: string;
  sampleWorkflow?: Workflow;
}

export class OpenAIClient {
  private client: OpenAI | null = null;
  private config = getConfig();

  constructor() {
    if (this.config.llm.provider === 'openai' && this.config.llm.openai?.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.llm.openai.apiKey,
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async generateWorkflow(request: WorkflowGenerationRequest): Promise<Workflow> {
    if (!this.client) {
      throw new Error('OpenAI client is not configured. Set OPENAI_API_KEY environment variable.');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.llm.openai!.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const workflowJson = JSON.parse(content);
      
      // Ensure it's a valid workflow structure
      if (!workflowJson.nodes || !workflowJson.edges) {
        throw new Error('Invalid workflow structure returned from LLM');
      }

      return workflowJson as Workflow;
    } catch (error: any) {
      throw new Error(`Failed to generate workflow: ${error.message}`);
    }
  }

  private buildSystemPrompt(): string {
    const nodeDocs = getNodeDocumentationAsResource();
    const projectContext = getProjectContextAsResource();

    return `You are an expert at creating browser automation workflows for AutoMFlows.

${projectContext}

Available Node Types and Documentation:
${nodeDocs}

Your task is to create valid workflow JSON that accomplishes the user's request. The workflow must:
1. Start with a "start" node
2. Have valid node connections via edges
3. Use appropriate node types for the requested actions
4. Include proper node configurations
5. Follow best practices for browser automation

Return ONLY valid JSON in this format:
{
  "nodes": [...],
  "edges": [...]
}

Do not include any explanation or markdown formatting, only the JSON object.`;
  }

  private buildUserPrompt(request: WorkflowGenerationRequest): string {
    let prompt = `Create a workflow for the following use case:

Use Case: ${request.useCase}
User Request: ${request.userRequest}
`;

    if (request.sampleWorkflow) {
      prompt += `\nReference Sample Workflow (use as inspiration, but adapt for the new use case):\n${JSON.stringify(request.sampleWorkflow, null, 2)}`;
    }

    prompt += `\n\nGenerate a complete workflow JSON that accomplishes this use case.`;

    return prompt;
  }

  async analyzeAndFixWorkflow(
    workflow: Workflow,
    errorMessage: string,
    executionLogs?: string[]
  ): Promise<Workflow> {
    if (!this.client) {
      throw new Error('OpenAI client is not configured');
    }

    const systemPrompt = `You are an expert at fixing browser automation workflows. Analyze errors and suggest fixes.`;
    
    const userPrompt = `The following workflow has errors:

Workflow:
${JSON.stringify(workflow, null, 2)}

Error Message:
${errorMessage}

${executionLogs ? `Execution Logs:\n${executionLogs.join('\n')}` : ''}

Analyze the errors and return a fixed workflow JSON. Fix issues like:
- Invalid selectors
- Missing required node configurations
- Incorrect node connections
- Missing wait conditions
- Incorrect property values

Return ONLY the fixed workflow JSON, no explanations.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.llm.openai!.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const fixedWorkflow = JSON.parse(content);
      
      if (!fixedWorkflow.nodes || !fixedWorkflow.edges) {
        throw new Error('Invalid workflow structure returned from LLM');
      }

      return fixedWorkflow as Workflow;
    } catch (error: any) {
      throw new Error(`Failed to fix workflow: ${error.message}`);
    }
  }

  async extendWorkflow(
    workflow: Workflow,
    userRequest: string,
    modificationType?: string
  ): Promise<Workflow> {
    if (!this.client) {
      throw new Error('OpenAI client is not configured');
    }

    const systemPrompt = `You are an expert at extending and modifying browser automation workflows. 
Your task is to modify an existing workflow based on user requests while preserving the existing structure and connections.

Available modification types:
- add: Add new nodes to the workflow
- update: Update existing node properties (like selectors)
- insert: Insert nodes between existing connected nodes
- add_assertion: Add verification/assertion nodes

When modifying workflows:
1. Preserve all existing nodes and their configurations unless explicitly asked to change them
2. Maintain proper edge connections
3. Ensure node IDs remain unique
4. Keep the start node intact
5. Add appropriate wait nodes after navigation/click operations if needed`;

    const userPrompt = `Modify the following workflow based on this request:

User Request: ${userRequest}
Modification Type: ${modificationType || 'auto-detect'}

Current Workflow:
${JSON.stringify(workflow, null, 2)}

Apply the requested modifications and return the complete modified workflow JSON.
Preserve the existing structure and only make the requested changes.

Return ONLY the modified workflow JSON, no explanations.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.llm.openai!.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const extendedWorkflow = JSON.parse(content);
      
      if (!extendedWorkflow.nodes || !extendedWorkflow.edges) {
        throw new Error('Invalid workflow structure returned from LLM');
      }

      return extendedWorkflow as Workflow;
    } catch (error: any) {
      throw new Error(`Failed to extend workflow: ${error.message}`);
    }
  }
}
