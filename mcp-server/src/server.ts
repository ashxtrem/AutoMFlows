import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { loadWorkflowExamples, getWorkflowExample } from './resources/workflowExamples.js';
import { getNodeDocumentationAsResource, getNodeDocumentationByType } from './resources/nodeDocumentation.js';
import { getProjectContextAsResource } from './resources/projectContext.js';
import { createWorkflow } from './tools/createWorkflow.js';
import { executeWorkflow } from './tools/executeWorkflow.js';
import { getExecutionStatus } from './tools/getExecutionStatus.js';
import { analyzeWorkflowErrors } from './tools/analyzeWorkflowErrors.js';
import { fixWorkflow } from './tools/fixWorkflow.js';
import { validateWorkflow } from './tools/validateWorkflow.js';
import { extendWorkflow } from './tools/extendWorkflow.js';

// Load configuration
loadConfig();

const server = new Server(
  {
    name: 'automflows-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'automflows://workflow-examples',
        name: 'Workflow Examples',
        description: 'Sample workflows from the project',
        mimeType: 'application/json',
      },
      {
        uri: 'automflows://node-documentation',
        name: 'Node Documentation',
        description: 'Documentation for all available node types',
        mimeType: 'application/json',
      },
      {
        uri: 'automflows://project-context',
        name: 'Project Context',
        description: 'AutoMFlows project structure and conventions',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read Resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'automflows://workflow-examples': {
      const examples = loadWorkflowExamples();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              examples.map((e: any) => ({
                name: e.name,
                description: e.description,
                useCase: e.useCase,
                nodeCount: e.workflow.nodes.length,
                edgeCount: e.workflow.edges.length,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case 'automflows://node-documentation': {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: getNodeDocumentationAsResource(),
          },
        ],
      };
    }

    case 'automflows://project-context': {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: getProjectContextAsResource(),
          },
        ],
      };
    }

    default:
      if (uri.startsWith('automflows://workflow-example/')) {
        const name = uri.replace('automflows://workflow-example/', '');
        const example = getWorkflowExample(name);
        if (example) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(example.workflow, null, 2),
              },
            ],
          };
        }
      }
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_workflow',
        description: 'Create a new workflow from a user description and use case. Uses LLM if configured, otherwise uses rule-based generation.',
        inputSchema: {
          type: 'object',
          properties: {
            userRequest: {
              type: 'string',
              description: 'User request describing what the workflow should do',
            },
            useCase: {
              type: 'string',
              description: 'Use case description for the workflow',
            },
            sampleWorkflowName: {
              type: 'string',
              description: 'Optional: Name of a sample workflow to use as reference',
            },
          },
          required: ['userRequest', 'useCase'],
        },
      },
      {
        name: 'execute_workflow',
        description: 'Execute a workflow on the AutoMFlows backend',
        inputSchema: {
          type: 'object',
          properties: {
            workflow: {
              type: 'object',
              description: 'The workflow JSON to execute',
            },
            traceLogs: {
              type: 'boolean',
              description: 'Enable trace logging',
              default: false,
            },
            recordSession: {
              type: 'boolean',
              description: 'Record the session as video',
              default: false,
            },
          },
          required: ['workflow'],
        },
      },
      {
        name: 'get_execution_status',
        description: 'Get the current execution status of a workflow',
        inputSchema: {
          type: 'object',
          properties: {
            executionId: {
              type: 'string',
              description: 'Optional: Specific execution ID to check',
            },
            pollUntilComplete: {
              type: 'boolean',
              description: 'Poll until execution completes',
              default: false,
            },
            pollIntervalMs: {
              type: 'number',
              description: 'Polling interval in milliseconds',
              default: 1000,
            },
            maxDurationMs: {
              type: 'number',
              description: 'Maximum polling duration in milliseconds',
              default: 300000,
            },
          },
        },
      },
      {
        name: 'analyze_workflow_errors',
        description: 'Analyze errors from workflow execution and provide suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            workflow: {
              type: 'object',
              description: 'The workflow that had errors',
            },
            errorMessage: {
              type: 'string',
              description: 'Error message from execution',
            },
            executionLogs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: Execution logs for deeper analysis',
            },
          },
          required: ['workflow', 'errorMessage'],
        },
      },
      {
        name: 'fix_workflow',
        description: 'Fix a workflow based on error analysis. Uses LLM if configured, otherwise uses rule-based fixes.',
        inputSchema: {
          type: 'object',
          properties: {
            workflow: {
              type: 'object',
              description: 'The workflow to fix',
            },
            errorAnalysis: {
              type: 'array',
              description: 'Error analysis results from analyze_workflow_errors',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  severity: { type: 'string' },
                  message: { type: 'string' },
                  nodeId: { type: 'string' },
                  suggestedFix: { type: 'string' },
                },
              },
            },
            errorMessage: {
              type: 'string',
              description: 'Optional: Original error message',
            },
            executionLogs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: Execution logs',
            },
          },
          required: ['workflow', 'errorAnalysis'],
        },
      },
      {
        name: 'validate_workflow',
        description: 'Validate a workflow structure and return validation results',
        inputSchema: {
          type: 'object',
          properties: {
            workflow: {
              type: 'object',
              description: 'The workflow to validate',
            },
          },
          required: ['workflow'],
        },
      },
      {
        name: 'extend_workflow',
        description: 'Extend or modify an existing workflow by adding nodes, updating selectors, inserting nodes, or adding assertions',
        inputSchema: {
          type: 'object',
          properties: {
            workflow: {
              type: 'object',
              description: 'The workflow to extend',
            },
            userRequest: {
              type: 'string',
              description: 'Natural language request describing modifications (e.g., "Add a verify node after login", "Update selector for submit button", "Insert API call between login and dashboard")',
            },
            modificationType: {
              type: 'string',
              enum: ['add', 'update', 'insert', 'add_assertion', 'auto'],
              description: 'Optional: Type of modification (auto-detect if not specified)',
            },
            targetNodeId: {
              type: 'string',
              description: 'Optional: Specific node ID to target for modification',
            },
            position: {
              type: 'string',
              enum: ['before', 'after', 'end'],
              description: 'Optional: Position for insertion (before, after, or end)',
            },
          },
          required: ['workflow', 'userRequest'],
        },
      },
    ],
  };
});

// Call Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!args) {
    throw new Error('Tool arguments are required');
  }

  try {
    switch (name) {
      case 'create_workflow': {
        const result = await createWorkflow({
          userRequest: args.userRequest as string,
          useCase: args.useCase as string,
          sampleWorkflowName: args.sampleWorkflowName as string | undefined,
        });
        
        // Check if clarification is needed
        if (typeof result === 'object' && 'needsClarification' in result && result.needsClarification) {
          return {
            content: [
              {
                type: 'text',
                text: `The request needs clarification. Please provide more details:\n\n${result.clarificationQuestions?.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'execute_workflow': {
        const result = await executeWorkflow({
          workflow: args.workflow as any,
          traceLogs: args.traceLogs as boolean | undefined,
          recordSession: args.recordSession as boolean | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_execution_status': {
        const status = await getExecutionStatus({
          executionId: args.executionId as string | undefined,
          pollUntilComplete: args.pollUntilComplete as boolean | undefined,
          pollIntervalMs: args.pollIntervalMs as number | undefined,
          maxDurationMs: args.maxDurationMs as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case 'analyze_workflow_errors': {
        const analysis = analyzeWorkflowErrors({
          workflow: args.workflow as any,
          errorMessage: args.errorMessage as string,
          executionLogs: args.executionLogs as string[] | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      }

      case 'fix_workflow': {
        const fixedWorkflow = await fixWorkflow({
          workflow: args.workflow as any,
          errorAnalysis: args.errorAnalysis as any,
          errorMessage: args.errorMessage as string | undefined,
          executionLogs: args.executionLogs as string[] | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(fixedWorkflow, null, 2),
            },
          ],
        };
      }

      case 'validate_workflow': {
        const validation = validateWorkflow({
          workflow: args.workflow as any,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(validation, null, 2),
            },
          ],
        };
      }

      case 'extend_workflow': {
        const extended = await extendWorkflow({
          workflow: args.workflow as any,
          userRequest: args.userRequest as string,
          modificationType: args.modificationType as any,
          targetNodeId: args.targetNodeId as string | undefined,
          position: args.position as any,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(extended, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AutoMFlows MCP server running on stdio');
}

main().catch(console.error);
