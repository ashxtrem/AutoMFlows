import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AutoMFlows API',
      version: '1.0.0',
      description: 'API documentation for AutoMFlows workflow automation platform',
      contact: {
        name: 'AutoMFlows Support',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
            },
          },
          required: ['error'],
        },
        Workflow: {
          type: 'object',
          properties: {
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                description: 'Workflow node',
              },
            },
            edges: {
              type: 'array',
              items: {
                type: 'object',
                description: 'Workflow edge connecting nodes',
              },
            },
            groups: {
              type: 'array',
              items: {
                type: 'object',
                description: 'Workflow group',
              },
            },
          },
          required: ['nodes', 'edges'],
        },
        ExecutionStatus: {
          type: 'string',
          enum: ['idle', 'running', 'completed', 'error', 'stopped'],
          description: 'Execution status',
        },
        ScreenshotConfig: {
          type: 'object',
          description: 'Configuration for screenshot capture during execution. Screenshots are saved to the execution output directory.',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable screenshot capture. When true, screenshots are taken based on timing setting.',
              required: true,
            },
            timing: {
              type: 'string',
              enum: ['pre', 'post', 'both'],
              description: 'When to capture screenshots. "pre" = before node execution, "post" = after node execution, "both" = before and after.',
              default: 'post',
            },
          },
          required: ['enabled'],
        },
        ReportConfig: {
          type: 'object',
          description: 'Configuration for execution report generation. Supports multiple report formats for different use cases.',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable report generation. When true, reports are generated in the specified formats.',
              required: true,
            },
            outputPath: {
              type: 'string',
              description: 'Output directory path for reports. Relative paths are resolved from project root. Defaults to "./output" if not specified.',
              default: './output',
              example: './output',
            },
            reportTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['html', 'allure', 'json', 'junit', 'csv', 'markdown'],
              },
              description: 'Array of report types to generate. Multiple types can be specified. "html" = HTML report, "allure" = Allure report, "json" = JSON report, "junit" = JUnit XML, "csv" = CSV report, "markdown" = Markdown report.',
              required: true,
              example: ['html'],
            },
            reportRetention: {
              type: 'number',
              description: 'Number of reports to keep. Older reports are automatically deleted when limit is exceeded. Defaults to 10 if not specified.',
              default: 10,
              minimum: 1,
              example: 10,
            },
          },
          required: ['enabled', 'reportTypes'],
        },
        BreakpointConfig: {
          type: 'object',
          description: 'Breakpoint configuration for debugging (single mode only). Allows pausing execution at specific nodes to inspect state.',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable breakpoints. When true, execution pauses at nodes based on breakpointAt and breakpointFor settings.',
              required: true,
            },
            breakpointAt: {
              type: 'string',
              enum: ['pre', 'post', 'both'],
              description: 'When to pause execution. "pre" = before node execution, "post" = after node execution, "both" = before and after.',
              default: 'pre',
            },
            breakpointFor: {
              type: 'string',
              enum: ['all', 'marked'],
              description: 'Which nodes to pause on. "all" = pause at all nodes, "marked" = pause only at nodes marked with breakpoint flag.',
              default: 'all',
            },
          },
          required: ['enabled'],
        },
        StartNodeOverrides: {
          type: 'object',
          description: 'Override Start node properties for all workflows in parallel execution. These values override the Start node data in each workflow.',
          properties: {
            recordSession: {
              type: 'boolean',
              description: 'Override Start node recordSession property. Enables/disables video recording for all workflows.',
            },
            screenshotAllNodes: {
              type: 'boolean',
              description: 'Override Start node screenshotAllNodes property. Enables/disables screenshots for all nodes in all workflows.',
            },
            screenshotTiming: {
              type: 'string',
              enum: ['pre', 'post', 'both'],
              description: 'Override Start node screenshotTiming property. When to capture screenshots: before node execution, after, or both.',
            },
            slowMo: {
              type: 'number',
              description: 'Override Start node slowMo property. Delay in milliseconds between actions. Useful for debugging or slower execution.',
              example: 100,
            },
            scrollThenAction: {
              type: 'boolean',
              description: 'Override Start node scrollThenAction property. Whether to scroll element into view before performing actions.',
            },
          },
        },
        ExecuteWorkflowRequest: {
          type: 'object',
          description: 'Request body for workflow execution (supports both single and parallel modes). Auto-detects mode based on provided fields.',
          properties: {
            workflow: {
              $ref: '#/components/schemas/Workflow',
              description: 'Single workflow object (required for single mode). Provide this OR workflows/folderPath/files for parallel mode.',
            },
            workflows: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Workflow',
              },
              description: 'Array of workflow objects (required for parallel mode with workflows array). Provide this OR folderPath OR files for parallel mode.',
            },
            folderPath: {
              type: 'string',
              description: 'Path to folder containing workflows (required for parallel mode with folder). Example: "./tests/workflows/sample"',
              example: './tests/workflows/sample',
            },
            executionMode: {
              type: 'string',
              enum: ['single', 'parallel', 'auto'],
              default: 'auto',
              description: 'Execution mode. "auto" detects mode based on request structure. "single" requires workflow object. "parallel" requires workflows/folderPath/files.',
            },
            traceLogs: {
              type: 'boolean',
              default: false,
              description: 'Enable detailed trace logging for debugging. Logs are written to execution log files.',
            },
            screenshotConfig: {
              $ref: '#/components/schemas/ScreenshotConfig',
              description: 'Configure screenshot capture. Applies to both single and parallel modes.',
            },
            reportConfig: {
              $ref: '#/components/schemas/ReportConfig',
              description: 'Configure report generation. Supports multiple report types: html, allure, json, junit, csv, markdown. Applies to both single and parallel modes.',
            },
            recordSession: {
              type: 'boolean',
              default: false,
              description: 'Enable video recording of browser session. Videos are saved to output directory.',
            },
            workflowFileName: {
              type: 'string',
              description: 'Workflow filename for single mode execution. Used for naming output directories and reports.',
              example: 'my-workflow.json',
            },
            breakpointConfig: {
              $ref: '#/components/schemas/BreakpointConfig',
              description: 'Breakpoint configuration for debugging (single mode only). Allows pausing execution at specific nodes for inspection.',
            },
            builderModeEnabled: {
              type: 'boolean',
              default: false,
              description: 'Enable builder mode for action recording (single mode only). Records user interactions to generate workflow nodes.',
            },
            workers: {
              type: 'number',
              default: 4,
              minimum: 1,
              description: 'Maximum concurrent workers for parallel execution. Use 1 for MCP/API execution to avoid wait node pauses. Each batch respects its own worker limit.',
              example: 4,
            },
            outputPath: {
              type: 'string',
              default: './output',
              description: 'Output directory for reports, logs, screenshots, and videos (parallel mode). Relative paths are resolved from project root.',
              example: './output',
            },
            recursive: {
              type: 'boolean',
              default: false,
              description: 'Scan subdirectories when using folderPath (folder mode only). If false, only scans the specified folder.',
            },
            pattern: {
              type: 'string',
              default: '*.json',
              description: 'File pattern to match when scanning folder (folder mode only). Supports glob patterns.',
              example: '*.json',
            },
            startNodeOverrides: {
              $ref: '#/components/schemas/StartNodeOverrides',
              description: 'Override Start node properties for all workflows in parallel execution. Useful for applying consistent settings across multiple workflows.',
            },
            batchPriority: {
              type: 'number',
              default: 0,
              description: 'Batch priority for queue ordering (parallel mode). Higher priority batches are processed first. Default 0 means FIFO order.',
              example: 0,
            },
          },
        },
        ExecuteWorkflowResponse: {
          type: 'object',
          description: 'Response from workflow execution',
          properties: {
            executionId: {
              type: 'string',
              description: 'Execution ID (present for single mode)',
            },
            status: {
              type: 'string',
              description: 'Status (present for single mode)',
            },
            executionMode: {
              type: 'string',
              enum: ['single', 'parallel'],
              description: 'Execution mode used',
            },
            batchId: {
              type: 'string',
              description: 'Batch ID (present for parallel mode)',
            },
            sourceType: {
              type: 'string',
              enum: ['folder', 'files', 'workflows'],
              description: 'Source type (present for parallel mode)',
            },
            folderPath: {
              type: 'string',
              description: 'Folder path (present if sourceType is folder)',
            },
            totalWorkflows: {
              type: 'number',
              description: 'Total workflows (present for parallel mode)',
            },
            validWorkflows: {
              type: 'number',
              description: 'Valid workflows count (present for parallel mode)',
            },
            invalidWorkflows: {
              type: 'number',
              description: 'Invalid workflows count (present for parallel mode)',
            },
            validationErrors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fileName: {
                    type: 'string',
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                },
              },
              description: 'Validation errors (present for parallel mode)',
            },
            executions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  executionId: {
                    type: 'string',
                  },
                  workflowFileName: {
                    type: 'string',
                  },
                  workflowPath: {
                    type: 'string',
                  },
                  status: {
                    $ref: '#/components/schemas/ExecutionStatus',
                  },
                  workerId: {
                    type: 'number',
                  },
                  validationErrors: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                },
              },
              description: 'Execution details (present for parallel mode)',
            },
          },
          required: ['executionMode'],
        },
        ExecutionStatusResponse: {
          type: 'object',
          properties: {
            executionId: {
              type: 'string',
            },
            status: {
              $ref: '#/components/schemas/ExecutionStatus',
            },
            currentNodeId: {
              type: 'string',
            },
            error: {
              type: 'string',
            },
            pausedNodeId: {
              type: 'string',
              nullable: true,
            },
            pauseReason: {
              type: 'string',
              enum: ['wait-pause', 'breakpoint', null],
              nullable: true,
            },
          },
          required: ['executionId', 'status'],
        },
        StopExecutionResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            executionId: {
              type: 'string',
            },
            wasRunning: {
              type: 'boolean',
            },
            wasQueued: {
              type: 'boolean',
            },
          },
          required: ['success', 'message'],
        },
        WorkflowFileInfo: {
          type: 'object',
          description: 'Workflow file scan result with validation status',
          properties: {
            fileName: {
              type: 'string',
              description: 'File name',
            },
            filePath: {
              type: 'string',
              description: 'Relative path from scan root',
            },
            isValid: {
              type: 'boolean',
              description: 'Whether the file is a valid workflow',
            },
            validationErrors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Validation errors if invalid',
            },
            workflow: {
              $ref: '#/components/schemas/Workflow',
              description: 'Parsed workflow object if valid',
            },
          },
          required: ['fileName', 'filePath', 'isValid'],
        },
        BatchStatusResponse: {
          type: 'object',
          properties: {
            batchId: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['running', 'completed', 'error', 'stopped'],
            },
            sourceType: {
              type: 'string',
              enum: ['folder', 'files', 'workflows'],
            },
            folderPath: {
              type: 'string',
            },
            totalWorkflows: {
              type: 'number',
            },
            completed: {
              type: 'number',
            },
            running: {
              type: 'number',
            },
            queued: {
              type: 'number',
            },
            failed: {
              type: 'number',
            },
            startTime: {
              type: 'number',
              description: 'Unix timestamp in milliseconds',
            },
            endTime: {
              type: 'number',
              nullable: true,
              description: 'Unix timestamp in milliseconds',
            },
            executions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  executionId: {
                    type: 'string',
                  },
                  workflowFileName: {
                    type: 'string',
                  },
                  status: {
                    $ref: '#/components/schemas/ExecutionStatus',
                  },
                  error: {
                    type: 'string',
                  },
                },
              },
            },
          },
          required: ['batchId', 'status', 'sourceType', 'totalWorkflows', 'completed', 'running', 'queued', 'failed', 'startTime', 'executions'],
        },
        BatchHistoryResponse: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
            },
            limit: {
              type: 'number',
            },
            offset: {
              type: 'number',
            },
            batches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  batchId: {
                    type: 'string',
                  },
                  status: {
                    type: 'string',
                    enum: ['running', 'completed', 'error', 'stopped'],
                  },
                  sourceType: {
                    type: 'string',
                    enum: ['folder', 'files', 'workflows'],
                  },
                  folderPath: {
                    type: 'string',
                  },
                  totalWorkflows: {
                    type: 'number',
                  },
                  completed: {
                    type: 'number',
                  },
                  failed: {
                    type: 'number',
                  },
                  startTime: {
                    type: 'number',
                    description: 'Unix timestamp in milliseconds',
                  },
                  endTime: {
                    type: 'number',
                    nullable: true,
                    description: 'Unix timestamp in milliseconds',
                  },
                  duration: {
                    type: 'number',
                    description: 'Duration in milliseconds',
                  },
                },
              },
            },
          },
          required: ['total', 'limit', 'offset', 'batches'],
        },
        StopBatchResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            batchId: {
              type: 'string',
            },
            stoppedExecutions: {
              type: 'number',
            },
            runningStopped: {
              type: 'number',
            },
            queuedCancelled: {
              type: 'number',
            },
          },
          required: ['success', 'message', 'batchId'],
        },
        StopAllResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            totalBatches: {
              type: 'number',
            },
            totalStopped: {
              type: 'number',
            },
            runningStopped: {
              type: 'number',
            },
            queuedCancelled: {
              type: 'number',
            },
            batches: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['success', 'message'],
        },
        ClearBatchesResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful',
            },
            message: {
              type: 'string',
              description: 'Success message',
            },
            batchesDeleted: {
              type: 'number',
              description: 'Number of batches deleted',
            },
            executionsDeleted: {
              type: 'number',
              description: 'Number of executions deleted',
            },
          },
          required: ['success', 'message', 'batchesDeleted', 'executionsDeleted'],
        },
        PluginMetadata: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Plugin directory name',
            },
            manifest: {
              type: 'object',
              description: 'Plugin manifest',
            },
            path: {
              type: 'string',
              description: 'Absolute path to plugin directory',
            },
            loaded: {
              type: 'boolean',
            },
            error: {
              type: 'string',
            },
          },
          required: ['id', 'manifest', 'path', 'loaded'],
        },
        SelectorOption: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
            },
            selectorType: {
              type: 'string',
              enum: ['css', 'xpath', 'getByRole', 'getByText', 'getByLabel', 'getByPlaceholder', 'getByTestId', 'getByTitle', 'getByAltText'],
            },
            confidence: {
              type: 'number',
            },
            reason: {
              type: 'string',
            },
          },
        },
        SelectorFinderStartResponse: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
            },
            pageUrl: {
              type: 'string',
            },
          },
          required: ['sessionId', 'pageUrl'],
        },
        SelectorFinderStatusResponse: {
          type: 'object',
          properties: {
            active: {
              type: 'boolean',
            },
            sessionId: {
              type: 'string',
              nullable: true,
            },
            pageUrl: {
              type: 'string',
              nullable: true,
            },
          },
          required: ['active'],
        },
        BuilderModeStatusResponse: {
          type: 'object',
          properties: {
            active: {
              type: 'boolean',
            },
            recording: {
              type: 'boolean',
            },
            sessionId: {
              type: 'string',
              nullable: true,
            },
            pageUrl: {
              type: 'string',
              nullable: true,
            },
          },
          required: ['active', 'recording'],
        },
        RecordedAction: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
            },
            selector: {
              type: 'string',
            },
            value: {
              type: 'string',
            },
            timestamp: {
              type: 'number',
            },
          },
        },
        ReportFolder: {
          type: 'object',
          properties: {
            folderName: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            reportTypes: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  path: {
                    type: 'string',
                  },
                  type: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        FileReadResponse: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
            },
            parsed: {
              type: 'object',
              description: 'Parsed JSON object if file is valid JSON',
            },
            error: {
              type: 'string',
              description: 'Error message if JSON parsing failed',
            },
          },
          required: ['content'],
        },
      },
    },
    tags: [
      {
        name: 'Workflows',
        description: 'Workflow execution and management endpoints',
      },
      {
        name: 'Plugins',
        description: 'Plugin management endpoints',
      },
      {
        name: 'Reports',
        description: 'Report management endpoints',
      },
      {
        name: 'Files',
        description: 'File reading endpoints',
      },
    ],
  },
  apis: [
    // Normalize to forward slashes — glob (used by swagger-jsdoc) requires POSIX separators on Windows
    path.resolve(__dirname, '../routes/*.ts').replace(/\\/g, '/'),
    path.resolve(__dirname, '../routes/*.js').replace(/\\/g, '/'),
    path.resolve(__dirname, '../../src/routes/*.ts').replace(/\\/g, '/'),
    path.resolve(__dirname, '../../src/routes/*.js').replace(/\\/g, '/'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
