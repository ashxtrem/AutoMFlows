import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import multer from 'multer';
import { 
  ExecuteWorkflowRequest, 
  ExecutionStatusResponse, 
  StopExecutionResponse, 
  SelectorFinderEvent, 
  SelectorOption, 
  RecordedAction,
  ExecuteWorkflowResponse,
  BatchStatusResponse,
  BatchHistoryResponse,
  StopBatchResponse,
  StopAllResponse
} from '@automflows/shared';
import { Executor } from '../engine/executor';
import { SelectorSessionManager } from '../utils/selectorSessionManager';
import { FinderInjector } from '../utils/finderInjector';
import { ActionRecorderSessionManager } from '../utils/actionRecorderSessionManager';
import { ActionRecorderInjector } from '../utils/actionRecorderInjector';
import { getExecutionManager } from '../utils/executionManager';
import { WorkflowScanner } from '../utils/workflowScanner';
import { getBatchPersistence } from '../utils/batchPersistence';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

export default function workflowRoutes(io: Server) {
  const router = Router();
  const executionManager = getExecutionManager(io, 4); // Default 4 workers

  /**
   * @swagger
   * /api/workflows/execute:
   *   post:
   *     summary: Execute workflow(s) - supports both single and parallel execution
   *     description: |
   *       Unified execute endpoint that supports both single workflow execution and parallel batch execution.
   *       Handles both JSON (application/json) and multipart/form-data requests.
   *       Auto-detects execution mode based on request structure.
   *       
   *       **Single Mode**: Provide `workflow` object
   *       **Parallel Mode**: Provide `workflows` array, `folderPath`, or upload `files` via multipart/form-data
   *       
   *       **Example - Multiple Files Upload (multipart/form-data)**:
   *       ```
   *       curl --location 'http://localhost:3003/api/workflows/execute' \
   *       --header 'accept: application/json' \
   *       --form 'files=@"/path/to/workflow1.json"' \
   *       --form 'files=@"/path/to/workflow2.json"' \
   *       --form 'files=@"/path/to/workflow3.json"' \
   *       --form 'workers="1"' \
   *       --form 'traceLogs="false"' \
   *       --form 'recordSession="false"' \
   *       --form 'outputPath="./output"' \
   *       --form 'reportConfig="{\"enabled\":true,\"outputPath\":\"./output\",\"reportTypes\":[\"html\"],\"reportRetention\":10}"'
   *       ```
   *       
   *       **Common Options** (apply to both modes):
   *       - `traceLogs`: Enable detailed trace logging
   *       - `screenshotConfig`: Configure screenshot capture (enabled, timing: pre/post/both)
   *       - `reportConfig`: Configure report generation (enabled, reportTypes: html/allure/json/junit/csv/markdown, outputPath, reportRetention)
   *       - `recordSession`: Enable video recording of execution
   *       
   *       **Single Mode Only**:
   *       - `workflowFileName`: Name for the workflow file
   *       - `breakpointConfig`: Configure breakpoints for debugging (enabled, breakpointAt: pre/post/both, breakpointFor: all/marked)
   *       - `builderModeEnabled`: Enable builder mode for action recording
   *       
   *       **Parallel Mode Only**:
   *       - `workers`: Maximum concurrent workers (default: 4, use 1 for MCP/API to avoid wait node pauses)
   *       - `outputPath`: Output directory for reports/logs (default: "./output")
   *       - `recursive`: Scan subdirectories when using folderPath (default: false)
   *       - `pattern`: File pattern to match (default: "*.json")
   *       - `startNodeOverrides`: Override Start node properties (recordSession, screenshotAllNodes, screenshotTiming, slowMo, scrollThenAction)
   *       - `batchPriority`: Batch priority for queue ordering (higher = processed first, default: 0 = FIFO)
   *     tags: [Workflows]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ExecuteWorkflowRequest'
   *           examples:
   *             singleModeBasic:
   *               summary: Single workflow execution (basic)
   *               value:
   *                 workflow:
   *                   nodes:
   *                     - id: "start-1"
   *                       type: "start"
   *                       position: { x: 0, y: 0 }
   *                       data: {}
   *                   edges: []
   *                 executionMode: "single"
   *                 workflowFileName: "my-workflow.json"
   *             singleModeWithReports:
   *               summary: Single workflow with HTML reporting
   *               value:
   *                 workflow:
   *                   nodes:
   *                     - id: "start-1"
   *                       type: "start"
   *                       position: { x: 0, y: 0 }
   *                       data: {}
   *                   edges: []
   *                 executionMode: "single"
   *                 workflowFileName: "my-workflow.json"
   *                 traceLogs: true
   *                 recordSession: false
   *                 screenshotConfig:
   *                   enabled: true
   *                   timing: "both"
   *                 reportConfig:
   *                   enabled: true
   *                   outputPath: "./output"
   *                   reportTypes: ["html"]
   *                   reportRetention: 10
   *             singleModeWithBreakpoints:
   *               summary: Single workflow with breakpoints (debugging)
   *               value:
   *                 workflow:
   *                   nodes:
   *                     - id: "start-1"
   *                       type: "start"
   *                       position: { x: 0, y: 0 }
   *                       data: {}
   *                   edges: []
   *                 executionMode: "single"
   *                 workflowFileName: "my-workflow.json"
   *                 breakpointConfig:
   *                   enabled: true
   *                   breakpointAt: "pre"
   *                   breakpointFor: "marked"
   *             parallelModeFolder:
   *               summary: Parallel execution with folder path
   *               value:
   *                 folderPath: "./tests/workflows/sample"
   *                 executionMode: "parallel"
   *                 workers: 4
   *                 recursive: true
   *                 pattern: "*.json"
   *                 outputPath: "./output"
   *                 traceLogs: false
   *                 recordSession: false
   *             parallelModeFolderWithReports:
   *               summary: Parallel execution with folder path and HTML reporting
   *               value:
   *                 folderPath: "./tests/workflows/sample"
   *                 executionMode: "parallel"
   *                 workers: 2
   *                 recursive: true
   *                 pattern: "*.json"
   *                 outputPath: "./output"
   *                 traceLogs: true
   *                 recordSession: false
   *                 screenshotConfig:
   *                   enabled: true
   *                   timing: "post"
   *                 reportConfig:
   *                   enabled: true
   *                   outputPath: "./output"
   *                   reportTypes: ["html", "json"]
   *                   reportRetention: 20
   *                 startNodeOverrides:
   *                   recordSession: false
   *                   screenshotAllNodes: true
   *                   screenshotTiming: "both"
   *                   slowMo: 100
   *                   scrollThenAction: true
   *             parallelModeWorkflowsArray:
   *               summary: Parallel execution with workflows array
   *               value:
   *                 workflows:
   *                   - nodes:
   *                       - id: "start-1"
   *                         type: "start"
   *                         position: { x: 0, y: 0 }
   *                         data: {}
   *                     edges: []
   *                   - nodes:
   *                       - id: "start-2"
   *                         type: "start"
   *                         position: { x: 0, y: 0 }
   *                         data: {}
   *                     edges: []
   *                 executionMode: "parallel"
   *                 workers: 2
   *                 reportConfig:
   *                   enabled: true
   *                   reportTypes: ["html"]
   *             parallelModeSingleWorker:
   *               summary: Parallel execution with single worker (for MCP/API)
   *               value:
   *                 folderPath: "./tests/workflows/sample"
   *                 executionMode: "parallel"
   *                 workers: 1
   *                 recursive: true
   *                 pattern: "*.json"
   *                 reportConfig:
   *                   enabled: true
   *                   reportTypes: ["html", "allure"]
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             example:
   *               files:
   *                 - workflow1.json
   *                 - workflow2.json
   *                 - workflow3.json
   *               workers: "1"
   *               traceLogs: "false"
   *               recordSession: "false"
   *               outputPath: "./output"
   *               reportConfig: '{"enabled":true,"outputPath":"./output","reportTypes":["html"],"reportRetention":10}'
   *             properties:
   *               files:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 description: Workflow JSON files to execute (required). Upload multiple files by including multiple --form 'files=@...' parameters in curl.
   *                 required: true
   *               workers:
   *                 type: string
   *                 default: "4"
   *                 description: Max concurrent workers (e.g., "1", "4")
   *               traceLogs:
   *                 type: string
   *                 default: "false"
   *                 description: Enable trace logs ("true" or "false")
   *               recordSession:
   *                 type: string
   *                 default: "false"
   *                 description: Enable video recording ("true" or "false")
   *               outputPath:
   *                 type: string
   *                 default: "./output"
   *                 description: Output directory for reports and logs
   *               recursive:
   *                 type: string
   *                 default: "false"
   *                 description: Scan subdirectories ("true" or "false")
   *               pattern:
   *                 type: string
   *                 default: "*.json"
   *                 description: File pattern to match (e.g., "*.json", "*.workflow.json")
   *               screenshotConfig:
   *                 type: string
   *                 description: 'JSON string for screenshot config. Example: {"enabled":true,"timing":"both"}'
   *                 example: '{"enabled":true,"timing":"both"}'
   *               reportConfig:
   *                 type: string
   *                 description: 'JSON string for report config. Example: {"enabled":true,"outputPath":"./output","reportTypes":["html"],"reportRetention":10}'
   *                 example: '{"enabled":true,"outputPath":"./output","reportTypes":["html"],"reportRetention":10}'
   *               startNodeOverrides:
   *                 type: string
   *                 description: 'JSON string for start node overrides. Example: {"recordSession":false,"screenshotAllNodes":true,"screenshotTiming":"both","slowMo":100}'
   *                 example: '{"recordSession":false,"screenshotAllNodes":true,"screenshotTiming":"both","slowMo":100}'
   *           examples:
   *             multipleFilesWithReports:
   *               summary: Upload multiple workflow JSON files with HTML reporting
   *               description: |
   *                 Example curl command for uploading multiple workflow files:
   *                 
   *                 curl --location 'http://localhost:3003/api/workflows/execute' \
   *                 --header 'accept: application/json' \
   *                 --form 'files=@"/path/to/workflow1.json"' \
   *                 --form 'files=@"/path/to/workflow2.json"' \
   *                 --form 'files=@"/path/to/workflow3.json"' \
   *                 --form 'workers="1"' \
   *                 --form 'traceLogs="false"' \
   *                 --form 'recordSession="false"' \
   *                 --form 'outputPath="./output"' \
   *                 --form 'reportConfig="{\"enabled\":true,\"outputPath\":\"./output\",\"reportTypes\":[\"html\"],\"reportRetention\":10}"'
   *               value:
   *                 files:
   *                   - workflow1.json
   *                   - workflow2.json
   *                   - workflow3.json
   *                 workers: "1"
   *                 traceLogs: "false"
   *                 recordSession: "false"
   *                 outputPath: "./output"
   *                 reportConfig: '{"enabled":true,"outputPath":"./output","reportTypes":["html"],"reportRetention":10}'
   *             singleFileBasic:
   *               summary: Upload single workflow file (basic)
   *               value:
   *                 files:
   *                   - workflow.json
   *                 workers: "4"
   *                 traceLogs: "false"
   *                 recordSession: "false"
   *                 outputPath: "./output"
   *     responses:
   *       200:
   *         description: Workflow execution started successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExecuteWorkflowResponse'
   *             examples:
   *               singleMode:
   *                 summary: Single mode response
   *                 value:
   *                   executionId: "exec-123"
   *                   status: "running"
   *                   executionMode: "single"
   *               parallelMode:
   *                 summary: Parallel mode response
   *                 value:
   *                   batchId: "batch-456"
   *                   executionMode: "parallel"
   *                   sourceType: "files"
   *                   totalWorkflows: 5
   *                   validWorkflows: 5
   *                   invalidWorkflows: 0
   *                   executions:
   *                     - executionId: "exec-1"
   *                       workflowFileName: "workflow1.json"
   *                       status: "running"
   *       400:
   *         description: Bad request - invalid workflow format or missing required fields
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/execute', upload.array('files'), async (req: Request, res: Response) => {
    try {
      const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
      let body: ExecuteWorkflowRequest | any = req.body;

      // Handle multipart/form-data
      if (isMultipart && req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files as Express.Multer.File[];
        
        // Parse form data fields
        const workers = body.workers ? parseInt(body.workers, 10) : 4;
        const traceLogs = body.traceLogs === 'true' || body.traceLogs === true;
        const recordSession = body.recordSession === 'true' || body.recordSession === true;
        const outputPath = body.outputPath || './output';
        const recursive = body.recursive === 'true' || body.recursive === true;
        const pattern = body.pattern || '*.json';

        // Parse JSON fields
        let screenshotConfig, reportConfig, startNodeOverrides;
        try {
          screenshotConfig = body.screenshotConfig ? JSON.parse(body.screenshotConfig) : undefined;
          reportConfig = body.reportConfig ? JSON.parse(body.reportConfig) : undefined;
          startNodeOverrides = body.startNodeOverrides ? JSON.parse(body.startNodeOverrides) : undefined;
        } catch (parseError: any) {
          return res.status(400).json({ 
            error: 'Invalid JSON in form data fields',
            message: parseError.message,
          });
        }

        // Process uploaded files
        const processed = WorkflowScanner.processFiles(files, startNodeOverrides);
        const workflowFiles = processed
          .filter(f => f.isValid && f.workflow)
          .map(f => ({
            workflow: f.workflow!,
            fileName: f.fileName,
            filePath: f.filePath,
          }));

        if (workflowFiles.length === 0) {
          return res.status(400).json({ 
            error: 'No valid workflows found',
            validationErrors: processed.filter(f => !f.isValid).map(f => ({
              fileName: f.fileName,
              errors: f.validationErrors || [],
            })),
          });
        }

        // Warn about unsupported features
        if (body.breakpointConfig) {
          console.warn('[WARN] breakpointConfig is not supported in parallel execution.');
        }
        if (body.builderModeEnabled === 'true' || body.builderModeEnabled === true) {
          console.warn('[WARN] builderModeEnabled is not supported in parallel execution.');
        }

        // Start batch execution
        const batchId = await executionManager.startBatchExecution(workflowFiles, {
          sourceType: 'files',
          workers,
          traceLogs,
          screenshotConfig,
          reportConfig,
          recordSession,
          outputPath,
          startNodeOverrides,
          priority: 0,
        });

        const batch = executionManager.getBatchStatus(batchId);
        if (!batch) {
          return res.status(500).json({ error: 'Failed to create batch' });
        }

        const validationErrors = processed
          .filter(f => !f.isValid)
          .map(f => ({
            fileName: f.fileName,
            errors: f.validationErrors || [],
          }));

        res.json({
          batchId,
          executionMode: 'parallel',
          sourceType: 'files',
          totalWorkflows: batch.totalWorkflows,
          validWorkflows: batch.validWorkflows,
          invalidWorkflows: batch.invalidWorkflows,
          validationErrors,
          executions: batch.executionIds.map((execId, index) => {
            const exec = executionManager.getExecutionStatus(execId);
            // Get workflow file info from the original workflowFiles array using index
            const workflowFile = workflowFiles[index];
            return {
              executionId: execId,
              workflowFileName: workflowFile?.fileName || 'workflow.json',
              workflowPath: workflowFile?.filePath,
              status: exec?.status || 'idle',
              validationErrors: [],
            };
          }),
        } as ExecuteWorkflowResponse);
        return;
      }

      // Handle JSON (application/json)
      const { 
        workflow, 
        workflows, 
        folderPath,
        executionMode = 'auto',
        traceLogs = false, 
        screenshotConfig, 
        reportConfig, 
        recordSession = false, 
        breakpointConfig, 
        builderModeEnabled = false, 
        workflowFileName,
        workers = 4,
        outputPath = './output',
        recursive = false,
        pattern = '*.json',
        startNodeOverrides,
        batchPriority = 0,
      } = body as ExecuteWorkflowRequest;

      // Determine execution mode
      let mode: 'single' | 'parallel' = 'single';
      if (executionMode === 'auto') {
        // Auto-detect: single if workflow object provided, parallel if workflows/folderPath provided
        if (workflow && (workflows || folderPath)) {
          return res.status(400).json({ 
            error: 'Cannot provide both single workflow and parallel execution inputs. Provide either "workflow" OR ("workflows" | "folderPath" | "files")' 
          });
        }
        if (workflows || folderPath) {
          mode = 'parallel';
        } else if (workflow) {
          mode = 'single';
        } else {
          return res.status(400).json({ 
            error: 'Must provide either "workflow" (single mode) OR ("workflows" | "folderPath" | "files") (parallel mode)' 
          });
        }
      } else {
        mode = executionMode as 'single' | 'parallel';
      }

      // Single mode execution
      if (mode === 'single') {
        if (!workflow || !workflow.nodes || !workflow.edges) {
          return res.status(400).json({ error: 'Invalid workflow format' });
        }

        // Note: breakpointConfig and builderModeEnabled are controlled via localStorage (frontend), not API
        // They're passed here for backward compatibility but should come from frontend localStorage
        
        const executionId = await executionManager.startSingleExecution(workflow, {
          traceLogs,
          screenshotConfig,
          reportConfig,
          recordSession,
          breakpointConfig,
          builderModeEnabled,
          workflowFileName,
        });

        res.json({
          executionId,
          status: 'running',
          executionMode: 'single',
        } as ExecuteWorkflowResponse);
        return;
      }

      // Parallel mode execution
      let workflowFiles: Array<{ workflow: any; fileName?: string; filePath?: string }> = [];
      let sourceType: 'folder' | 'files' | 'workflows' = 'workflows';
      let folderPathUsed: string | undefined;
      let scanned: any[] | undefined;

      // Determine source type and load workflows
      if (folderPath) {
        sourceType = 'folder';
        folderPathUsed = folderPath;
        scanned = WorkflowScanner.scanFolder(folderPath, {
          recursive,
          pattern,
          startNodeOverrides,
        });
        workflowFiles = scanned
          .filter(f => f.isValid && f.workflow)
          .map(f => ({
            workflow: f.workflow!,
            fileName: f.fileName,
            filePath: f.filePath,
          }));
      } else if (workflows && Array.isArray(workflows)) {
        sourceType = 'workflows';
        const processed = WorkflowScanner.processWorkflows(workflows, startNodeOverrides);
        workflowFiles = processed
          .filter(f => f.isValid && f.workflow)
          .map(f => ({
            workflow: f.workflow!,
            fileName: f.fileName,
            filePath: f.filePath,
          }));
        scanned = processed;
      } else {
        return res.status(400).json({ 
          error: 'For parallel mode, must provide "folderPath", "workflows" array, or "files" via multipart/form-data' 
        });
      }

      // Validate we have at least one valid workflow
      if (workflowFiles.length === 0) {
        return res.status(400).json({ 
          error: 'No valid workflows found',
          validationErrors: scanned?.filter(f => !f.isValid).map(f => ({
            fileName: f.fileName,
            errors: f.validationErrors || [],
          })) || [],
        });
      }

      // Warn about unsupported features in parallel mode
      if (breakpointConfig) {
        console.warn('[WARN] breakpointConfig is not supported in parallel execution. Use single workflow execution (/api/workflows/execute) for breakpoint debugging.');
      }
      if (builderModeEnabled) {
        console.warn('[WARN] builderModeEnabled is not supported in parallel execution. Use single workflow execution (/api/workflows/execute) for builder mode.');
      }

      // Start batch execution
      const batchId = await executionManager.startBatchExecution(workflowFiles, {
        sourceType,
        folderPath: folderPathUsed,
        workers,
        traceLogs,
        screenshotConfig,
        reportConfig,
        recordSession,
        outputPath,
        startNodeOverrides,
        priority: batchPriority,
      });

      // Get batch to build response
      const batch = executionManager.getBatchStatus(batchId);
      if (!batch) {
        return res.status(500).json({ error: 'Failed to create batch' });
      }

      const validationErrors = scanned 
        ? scanned.filter(f => !f.isValid).map(f => ({
            fileName: f.fileName,
            errors: f.validationErrors || [],
          }))
        : [];

      res.json({
        batchId,
        executionMode: 'parallel',
        sourceType,
        folderPath: folderPathUsed,
        totalWorkflows: batch.totalWorkflows,
        validWorkflows: batch.validWorkflows,
        invalidWorkflows: batch.invalidWorkflows,
        validationErrors,
        executions: batch.executionIds.map((execId, index) => {
          const exec = executionManager.getExecutionStatus(execId);
          // Get workflow file info from the original workflowFiles array using index
          // This ensures each execution gets its corresponding workflow file
          const workflowFile = workflowFiles[index];
          return {
            executionId: execId,
            workflowFileName: workflowFile?.fileName || 'workflow.json',
            workflowPath: workflowFile?.filePath,
            status: exec?.status || 'idle',
            validationErrors: [],
          };
        }),
      } as ExecuteWorkflowResponse);
    } catch (error: any) {
      console.error('Execute workflow error:', error);
      res.status(500).json({
        error: 'Failed to execute workflow',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/scan:
   *   get:
   *     summary: Scan folder for workflow files
   *     description: Preview workflows in a folder without executing. Returns validation status for each discovered file.
   *     tags: [Workflows]
   *     parameters:
   *       - in: query
   *         name: folderPath
   *         required: true
   *         schema:
   *           type: string
   *         description: Path to folder containing workflow JSON files (relative or absolute)
   *       - in: query
   *         name: recursive
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Scan subdirectories
   *       - in: query
   *         name: pattern
   *         schema:
   *           type: string
   *           default: "*.json"
   *         description: Glob pattern for file matching
   *     responses:
   *       200:
   *         description: Scan results with workflow validation status
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/WorkflowFileInfo'
   *       400:
   *         description: Bad request - folderPath parameter missing
   *       404:
   *         description: Folder not found
   *       500:
   *         description: Internal server error
   */
  router.get('/scan', (req: Request, res: Response) => {
    try {
      const { folderPath, recursive, pattern } = req.query;

      if (!folderPath || typeof folderPath !== 'string') {
        return res.status(400).json({
          error: 'folderPath query parameter is required',
        });
      }

      const recursiveBool = String(recursive) === 'true';
      const patternStr = (typeof pattern === 'string' ? pattern : undefined) || '*.json';

      const results = WorkflowScanner.scanFolder(folderPath, {
        recursive: recursiveBool,
        pattern: patternStr,
      });

      // Return sanitized results (exclude full workflow object for invalid items to reduce payload)
      const sanitized = results.map((r) => ({
        fileName: r.fileName,
        filePath: r.filePath,
        isValid: r.isValid,
        validationErrors: r.validationErrors,
        workflow: r.isValid ? r.workflow : undefined,
      }));

      res.json(sanitized);
    } catch (error: any) {
      if (error.message?.includes('Folder not found') || error.message?.includes('Path is not a directory')) {
        return res.status(404).json({
          error: error.message,
        });
      }
      console.error('Scan folder error:', error);
      res.status(500).json({
        error: 'Failed to scan folder',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/batch/{batchId}:
   *   get:
   *     summary: Get batch execution status
   *     description: Retrieve the current status of a batch execution including all individual workflow executions
   *     tags: [Workflows]
   *     parameters:
   *       - in: path
   *         name: batchId
   *         required: true
   *         schema:
   *           type: string
   *         description: Batch execution ID
   *     responses:
   *       200:
   *         description: Batch status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/BatchStatusResponse'
   *       404:
   *         description: Batch not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/execution/batch/:batchId', (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      const batch = executionManager.getBatchStatus(batchId);
      
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      // Get execution details with workflow file names from execution metadata
      // First, try to get all executions from persistence (more efficient than per-execution lookup)
      const persistedExecutions = getBatchPersistence().getBatchExecutions(batchId);
      const persistedExecMap = new Map(
        persistedExecutions.map(e => [e.executionId, e])
      );
      
      // If batch has folderPath and we have executionIds but no persisted executions,
      // try to reconstruct workflow file names by scanning the folder
      let folderWorkflowFiles: Array<{ fileName: string; filePath: string }> | null = null;
      if (batch.folderPath && batch.executionIds.length > 0 && persistedExecutions.length === 0) {
        try {
          const scanned = WorkflowScanner.scanFolder(batch.folderPath, {
            recursive: true,
            pattern: '*.json',
          });
          folderWorkflowFiles = scanned
            .filter(f => f.isValid && f.workflow)
            .map(f => ({
              fileName: f.fileName,
              filePath: f.filePath,
            }));
        } catch (error) {
          // If folder scan fails, continue without reconstruction
          console.warn(`[BatchStatus] Failed to scan folder ${batch.folderPath} for workflow reconstruction:`, error);
        }
      }
      
      const executions = batch.executionIds.map((execId, index) => {
        const exec = executionManager.getExecutionStatus(execId);
        // Try to get execution metadata to retrieve workflowFileName
        const execution = (executionManager as any).executions?.get(execId);
        let workflowFileName = 'workflow.json';
        let workflowPath: string | undefined;
        
        if (execution) {
          // Execution still in memory - use metadata
          workflowFileName = execution.workflowFileName || 'workflow.json';
          workflowPath = execution.workflowPath;
          
          // If it's still "workflow.json" and we have folder files, try to reconstruct
          if (workflowFileName === 'workflow.json' && folderWorkflowFiles && folderWorkflowFiles[index]) {
            workflowFileName = folderWorkflowFiles[index].fileName;
            workflowPath = folderWorkflowFiles[index].filePath;
          }
        } else {
          // Execution cleaned up - get from persistence
          const persistedExec = persistedExecMap.get(execId);
          if (persistedExec) {
            workflowFileName = persistedExec.workflowFileName || 'workflow.json';
            workflowPath = persistedExec.workflowPath;
            
            // If it's still "workflow.json" and we have folder files, try to reconstruct
            if (workflowFileName === 'workflow.json' && folderWorkflowFiles && folderWorkflowFiles[index]) {
              workflowFileName = folderWorkflowFiles[index].fileName;
              workflowPath = folderWorkflowFiles[index].filePath;
            }
          } else if (folderWorkflowFiles && folderWorkflowFiles[index]) {
            // No execution in memory or persistence, but we can reconstruct from folder
            workflowFileName = folderWorkflowFiles[index].fileName;
            workflowPath = folderWorkflowFiles[index].filePath;
          }
        }
        
        return {
          executionId: execId,
          workflowFileName,
          workflowPath,
          status: exec?.status || 'idle',
          error: exec?.error,
        };
      });

      res.json({
        batchId: batch.batchId,
        status: batch.status || 'running',
        sourceType: batch.sourceType,
        folderPath: batch.folderPath,
        totalWorkflows: batch.totalWorkflows,
        completed: batch.completed,
        running: batch.running,
        queued: batch.queued,
        failed: batch.failed,
        startTime: batch.startTime,
        endTime: batch.endTime,
        executions,
      } as BatchStatusResponse);
    } catch (error: any) {
      console.error('Get batch status error:', error);
      res.status(500).json({
        error: 'Failed to get batch status',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/executions/batches:
   *   get:
   *     summary: Get batch execution history
   *     description: Retrieve paginated list of batch executions with optional status filter
   *     tags: [Workflows]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [running, completed, error, stopped]
   *         description: Filter batches by status
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Maximum number of batches to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of batches to skip
   *     responses:
   *       200:
   *         description: Batch history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/BatchHistoryResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/executions/batches', (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const persistence = getBatchPersistence();
      const filters = status ? { status } : undefined;
      const pagination = { limit, offset };
      
      const result = persistence.getBatches(filters, pagination);

      res.json({
        total: result.total,
        limit,
        offset,
        batches: result.batches.map(batch => ({
          batchId: batch.batchId,
          status: batch.status,
          sourceType: batch.sourceType,
          folderPath: batch.folderPath,
          totalWorkflows: batch.totalWorkflows,
          completed: batch.completed,
          failed: batch.failed,
          startTime: batch.startTime,
          endTime: batch.endTime,
          duration: batch.endTime ? batch.endTime - batch.startTime : undefined,
        })),
      } as BatchHistoryResponse);
    } catch (error: any) {
      console.error('Get batch history error:', error);
      res.status(500).json({
        error: 'Failed to get batch history',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/executions/batches/clear:
   *   delete:
   *     summary: Clear all batch execution history
   *     description: |
   *       Delete all batches and executions from the database. 
   *       This action permanently removes all batch and execution records and cannot be undone.
   *       Useful for testing, maintenance, and resetting the execution history.
   *       
   *       **Warning**: This will delete all historical batch and execution data.
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: All batches and executions cleared successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ClearBatchesResponse'
   *             examples:
   *               success:
   *                 summary: Successful cleanup
   *                 value:
   *                   success: true
   *                   message: "All batches and executions cleared"
   *                   batchesDeleted: 5
   *                   executionsDeleted: 20
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.delete('/executions/batches/clear', (req: Request, res: Response) => {
    try {
      const persistence = getBatchPersistence();
      const result = persistence.clearAllBatches();
      
      res.json({
        success: true,
        message: 'All batches and executions cleared',
        batchesDeleted: result.batchesDeleted,
        executionsDeleted: result.executionsDeleted,
      });
    } catch (error: any) {
      console.error('Clear batches error:', error);
      res.status(500).json({
        error: 'Failed to clear batches',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/batch/{batchId}/stop:
   *   post:
   *     summary: Stop batch execution
   *     description: Stop a running batch execution and cancel queued workflows
   *     tags: [Workflows]
   *     parameters:
   *       - in: path
   *         name: batchId
   *         required: true
   *         schema:
   *           type: string
   *         description: Batch execution ID to stop
   *     responses:
   *       200:
   *         description: Batch stopped successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StopBatchResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/execution/batch/:batchId/stop', async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      const result = await executionManager.stopBatch(batchId);
      
      res.json({
        success: true,
        message: 'Batch stopped',
        batchId,
        stoppedExecutions: result.stoppedExecutions,
        runningStopped: result.runningStopped,
        queuedCancelled: result.queuedCancelled,
      } as StopBatchResponse);
    } catch (error: any) {
      console.error('Stop batch error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/stop-all:
   *   post:
   *     summary: Stop all active executions
   *     description: Stop all running batches and cancel all queued workflows
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: All executions stopped successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StopAllResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/execution/stop-all', async (req: Request, res: Response) => {
    try {
      const result = await executionManager.stopAll();
      
      res.json({
        success: true,
        message: 'All executions stopped',
        totalBatches: result.totalBatches,
        totalStopped: result.totalStopped,
        runningStopped: result.runningStopped,
        queuedCancelled: result.queuedCancelled,
        batches: result.batches,
      } as StopAllResponse);
    } catch (error: any) {
      console.error('Stop all error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/{executionId}:
   *   get:
   *     summary: Get execution status by ID
   *     description: Retrieve the status of a specific workflow execution
   *     tags: [Workflows]
   *     parameters:
   *       - in: path
   *         name: executionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Execution ID
   *     responses:
   *       200:
   *         description: Execution status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExecutionStatusResponse'
   *       404:
   *         description: Execution not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/execution/captured-dom', async (req: Request, res: Response) => {
    try {
      const execId = executionManager.getMostRecentExecutionId();
      if (!execId) {
        return res.status(404).json({
          success: false,
          message: 'No execution found',
        });
      }
      const executor = executionManager.getExecutor(execId);
      if (!executor) {
        return res.status(404).json({
          success: false,
          message: 'Execution executor not available',
        });
      }
      let debugInfo: any = null;
      if (executor.isExecutionPaused()) {
        const page = (executor as any).context?.getPage?.();
        if (page && !page.isClosed?.()) {
          const { PageDebugHelper } = await import('../utils/pageDebugHelper');
          debugInfo = await PageDebugHelper.captureDebugInfo(page);
        }
      }
      if (!debugInfo) {
        debugInfo = executor.getStoredDebugInfo?.() ?? null;
      }
      if (!debugInfo) {
        return res.status(404).json({
          success: false,
          message: 'No captured DOM available for this execution',
        });
      }
      res.json({ success: true, debugInfo });
    } catch (error: any) {
      console.error('Get captured DOM error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get captured DOM',
      });
    }
  });

  router.get('/execution/:executionId', (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      const status = executionManager.getExecutionStatus(executionId);
      
      if (!status) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      res.json(status as ExecutionStatusResponse);
    } catch (error: any) {
      console.error('Get execution status error:', error);
      res.status(500).json({
        error: 'Failed to get execution status',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/executions/active:
   *   get:
   *     summary: List active executions
   *     description: Get list of all currently active workflow executions
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Active executions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalActive:
   *                   type: number
   *                   description: Total number of active executions
   *                 executions:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ExecutionStatusResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/executions/active', (req: Request, res: Response) => {
    try {
      const active = executionManager.getActiveExecutions();
      
      res.json({
        totalActive: active.length,
        executions: active,
      });
    } catch (error: any) {
      console.error('Get active executions error:', error);
      res.status(500).json({
        error: 'Failed to get active executions',
        message: error.message,
      });
    }
  });

  router.post('/execution/continue', async (req: Request, res: Response) => {
    try {
      const { executionId } = req.body as { executionId?: string };
      
      // Get execution executor
      const execId = executionId || executionManager.getMostRecentExecutionId();
      if (!execId) {
        return res.status(400).json({
          success: false,
          message: 'No execution running',
        });
      }

      const status = executionManager.getExecutionStatus(execId);
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Execution not found',
        });
      }

      // Get executor from execution manager (need to access internal executor)
      // For now, we'll need to get the executor instance
      // This requires adding a method to ExecutionManager to get executor
      // For backward compatibility, we'll try to get it
      const execution = (executionManager as any).executions?.get(execId);
      if (!execution || !execution.executor) {
        return res.status(400).json({
          success: false,
          message: 'Execution executor not available',
        });
      }

      const executor = executionManager.getExecutor(execId);
      if (!executor) {
        return res.status(400).json({
          success: false,
          message: 'Execution executor not available',
        });
      }

      if (!executor.isExecutionPaused()) {
        return res.status(400).json({
          success: false,
          message: 'Execution is not paused',
        });
      }

      executor.continueExecution();
      res.json({
        success: true,
        message: 'Execution continued',
      });
    } catch (error: any) {
      console.error('Continue execution error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/status:
   *   get:
   *     summary: Get execution status
   *     description: Get execution status by ID (query param) or most recent execution (backward compatibility)
   *     tags: [Workflows]
   *     parameters:
   *       - in: query
   *         name: executionId
   *         schema:
   *           type: string
   *         description: Execution ID (optional, returns most recent if not provided)
   *     responses:
   *       200:
   *         description: Execution status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExecutionStatusResponse'
   *       404:
   *         description: Execution not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/execution/status', (req: Request, res: Response) => {
    try {
      const executionId = req.query.executionId as string | undefined;
      
      // If executionId provided, get specific execution status
      if (executionId) {
        const status = executionManager.getExecutionStatus(executionId);
        if (!status) {
          return res.status(404).json({ error: 'Execution not found' });
        }
        return res.json(status as ExecutionStatusResponse);
      }

      // Backward compatibility: get most recent execution
      const mostRecentId = executionManager.getMostRecentExecutionId();
      if (!mostRecentId) {
        return res.json({
          executionId: '',
          status: 'idle',
        } as ExecutionStatusResponse);
      }

      const status = executionManager.getExecutionStatus(mostRecentId);
      if (!status) {
        return res.json({
          executionId: '',
          status: 'idle',
        } as ExecutionStatusResponse);
      }

      res.json(status as ExecutionStatusResponse);
    } catch (error: any) {
      console.error('Get execution status error:', error);
      res.status(500).json({
        error: 'Failed to get execution status',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/stop:
   *   post:
   *     summary: Stop execution
   *     description: Stop a specific execution by ID or most recent execution (backward compatibility)
   *     tags: [Workflows]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               executionId:
   *                 type: string
   *                 description: Execution ID (optional, stops most recent if not provided)
   *     responses:
   *       200:
   *         description: Execution stopped successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StopExecutionResponse'
   *       400:
   *         description: Bad request - no execution running
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/execution/stop', async (req: Request, res: Response) => {
    try {
      const { executionId } = req.body as { executionId?: string };
      
      // If executionId provided, stop specific execution
      if (executionId) {
        const result = await executionManager.stopExecution(executionId);
        res.json({
          success: true,
          message: 'Execution stopped',
          executionId,
          wasRunning: result.wasRunning,
          wasQueued: result.wasQueued,
        } as StopExecutionResponse);
        return;
      }

      // Backward compatibility: stop most recent execution
      const mostRecentId = executionManager.getMostRecentExecutionId();
      if (!mostRecentId) {
        return res.json({
          success: false,
          message: 'No execution running',
        } as StopExecutionResponse);
      }

      const result = await executionManager.stopExecution(mostRecentId);
      res.json({
        success: true,
        message: 'Execution stopped',
        executionId: mostRecentId,
        wasRunning: result.wasRunning,
        wasQueued: result.wasQueued,
      } as StopExecutionResponse);
    } catch (error: any) {
      console.error('Stop execution error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      } as StopExecutionResponse);
    }
  });

  router.post('/execution/continue', async (req: Request, res: Response) => {
    try {
      const { executionId } = req.body as { executionId?: string };
      
      // Get execution executor
      const execId = executionId || executionManager.getMostRecentExecutionId();
      if (!execId) {
        return res.status(400).json({
          success: false,
          message: 'No execution running',
        });
      }

      const status = executionManager.getExecutionStatus(execId);
      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Execution not found',
        });
      }

      // Get executor instance
      const executor = executionManager.getExecutor(execId);
      if (!executor) {
        return res.status(400).json({
          success: false,
          message: 'Execution executor not available',
        });
      }
      if (!executor.isExecutionPaused()) {
        return res.status(400).json({
          success: false,
          message: 'Execution is not paused',
        });
      }

      executor.continueExecution();
      res.json({
        success: true,
        message: 'Execution continued',
      });
    } catch (error: any) {
      console.error('Continue execution error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/trace-logs:
   *   post:
   *     summary: Toggle trace logs
   *     description: Enable or disable trace logs for an execution
   *     tags: [Workflows]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - enabled
   *             properties:
   *               enabled:
   *                 type: boolean
   *                 description: Enable or disable trace logs
   *               executionId:
   *                 type: string
   *                 description: Execution ID (optional, uses most recent if not provided)
   *     responses:
   *       200:
   *         description: Trace logs toggled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/execution/trace-logs', async (req: Request, res: Response) => {
    try {
      const { enabled, executionId } = req.body as { enabled: boolean; executionId?: string };
      
      const execId = executionId || executionManager.getMostRecentExecutionId();
      if (!execId) {
        return res.status(400).json({
          success: false,
          message: 'No execution running',
        });
      }

      const executor = executionManager.getExecutor(execId);
      if (!executor) {
        return res.status(400).json({
          success: false,
          message: 'Execution executor not available',
        });
      }

      executor.setTraceLogs(enabled);
      res.json({
        success: true,
        message: `Trace logs ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      console.error('Toggle trace logs error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/pause-control:
   *   post:
   *     summary: Control paused execution
   *     description: Control a paused execution with actions like continue, stop, skip, or continue without breakpoint
   *     tags: [Workflows]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - action
   *             properties:
   *               action:
   *                 type: string
   *                 enum: [continue, stop, skip, continueWithoutBreakpoint]
   *                 description: Action to perform on paused execution
   *               executionId:
   *                 type: string
   *                 description: Execution ID (optional, uses most recent if not provided)
   *     responses:
   *       200:
   *         description: Action executed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Bad request - execution not paused or invalid action
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/execution/pause-control', async (req: Request, res: Response) => {
    try {
      const { action, executionId } = req.body as { action: 'continue' | 'stop' | 'skip' | 'continueWithoutBreakpoint'; executionId?: string };
      
      // Get execution executor
      const execId = executionId || executionManager.getMostRecentExecutionId();
      if (!execId) {
        return res.status(400).json({
          success: false,
          message: 'No execution running',
        });
      }

      const executor = executionManager.getExecutor(execId);
      if (!executor) {
        return res.status(400).json({
          success: false,
          message: 'Execution executor not available',
        });
      }

      if (!executor.isExecutionPaused()) {
        return res.status(400).json({
          success: false,
          message: 'Execution is not paused',
        });
      }

      switch (action) {
        case 'continue':
          executor.continueExecution();
          res.json({
            success: true,
            message: 'Execution continued',
          });
          break;
        case 'stop':
          executor.stopExecutionFromPause();
          await executionManager.stopExecution(execId);
          res.json({
            success: true,
            message: 'Execution stopped',
          });
          break;
        case 'skip':
          // Skip next node execution (only valid for pre breakpoint)
          executor.skipNextNodeExecution();
          res.json({
            success: true,
            message: 'Node will be skipped',
          });
          break;
        case 'continueWithoutBreakpoint':
          // Disable breakpoint and continue
          executor.disableBreakpointAndContinue();
          res.json({
            success: true,
            message: 'Execution continued without breakpoint',
          });
          break;
        default:
          res.status(400).json({
            success: false,
            message: `Invalid action: ${action}`,
          });
      }
    } catch (error: any) {
      console.error('Pause control error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/update-workflow:
   *   post:
   *     summary: Update workflow during execution
   *     description: Update workflow definition while execution is paused at a breakpoint (not valid for wait-pause)
   *     tags: [Workflows]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - workflow
   *             properties:
   *               workflow:
   *                 $ref: '#/components/schemas/Workflow'
   *                 description: Updated workflow definition
   *               executionId:
   *                 type: string
   *                 description: Execution ID (optional, uses most recent if not provided)
   *     responses:
   *       200:
   *         description: Workflow updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 executionOrder:
   *                   type: array
   *                   items:
   *                     type: string
   *                 executedNodes:
   *                   type: array
   *                   items:
   *                     type: string
   *       400:
   *         description: Bad request - execution not paused at breakpoint or invalid workflow
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/execution/update-workflow', async (req: Request, res: Response) => {
    try {
      const { workflow, executionId } = req.body as { workflow: any; executionId?: string };

      if (!workflow || !workflow.nodes || !workflow.edges) {
        return res.status(400).json({
          success: false,
          message: 'Invalid workflow format',
        });
      }

      const execId = executionId || executionManager.getMostRecentExecutionId();
      if (!execId) {
        return res.status(400).json({
          success: false,
          message: 'No execution running',
        });
      }

      const executor = executionManager.getExecutor(execId);
      if (!executor) {
        return res.status(400).json({
          success: false,
          message: 'Execution executor not available',
        });
      }

      if (!executor.isExecutionPaused()) {
        return res.status(400).json({
          success: false,
          message: 'Execution is not paused',
        });
      }

      // Check pause reason is breakpoint (not wait-pause)
      const pauseReason = executor.getPauseReason();
      if (pauseReason !== 'breakpoint') {
        return res.status(400).json({
          success: false,
          message: 'Workflow updates are only allowed during breakpoint pauses, not wait-pause',
          code: 'WAIT_PAUSE_NOT_ALLOWED',
        });
      }

      // Update workflow in executor
      try {
        executor.updateWorkflow(workflow);
        
        // Get updated execution state
        const executedNodeIds = executor.getExecutedNodeIds();
        const currentExecutionOrder = executor.getCurrentExecutionOrder();

        res.json({
          success: true,
          message: 'Workflow updated successfully',
          executionOrder: currentExecutionOrder,
          executedNodes: executedNodeIds,
        });
      } catch (error: any) {
        console.error('Update workflow error:', error);
        res.status(400).json({
          success: false,
          message: error.message || 'Failed to update workflow',
        });
      }
    } catch (error: any) {
      console.error('Update workflow error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update workflow',
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/execution/capture-dom:
   *   post:
   *     summary: Capture DOM at breakpoint
   *     description: Capture DOM debug information when execution is paused at a breakpoint
   *     tags: [Workflows]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               executionId:
   *                 type: string
   *                 description: Execution ID (optional, uses most recent if not provided)
   *     responses:
   *       200:
   *         description: DOM captured successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 debugInfo:
   *                   type: object
   *                   description: Debug information including page URL, source, and selector suggestions
   *       400:
   *         description: Bad request - execution not paused or no active page
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/execution/capture-dom', async (req: Request, res: Response) => {
    try {
      const { executionId } = req.body as { executionId?: string };
      
      const execId = executionId || executionManager.getMostRecentExecutionId();
      if (!execId) {
        return res.status(400).json({
          success: false,
          message: 'No execution running',
        });
      }

      const executor = executionManager.getExecutor(execId);
      if (!executor) {
        return res.status(400).json({
          success: false,
          message: 'Execution executor not available',
        });
      }

      if (!executor.isExecutionPaused()) {
        return res.status(400).json({
          success: false,
          message: 'Execution is not paused',
        });
      }

      // Get page from executor context
      const page = (executor as any).context?.getPage();
      if (!page || page.isClosed()) {
        return res.status(400).json({
          success: false,
          message: 'No active page available',
        });
      }

      // Import PageDebugHelper
      const { PageDebugHelper } = await import('../utils/pageDebugHelper');
      
      // Capture debug info
      const debugInfo = await PageDebugHelper.captureDebugInfo(page);

      res.json({
        success: true,
        debugInfo,
      });
    } catch (error: any) {
      console.error('Capture DOM error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to capture DOM',
      });
    }
  });

  router.get('/execution/:executionId/captured-dom', async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      const executor = executionManager.getExecutor(executionId);
      if (!executor) {
        return res.status(404).json({
          success: false,
          message: 'Execution not found or executor not available',
        });
      }
      let debugInfo: any = null;
      if (executor.isExecutionPaused()) {
        const page = (executor as any).context?.getPage?.();
        if (page && !page.isClosed?.()) {
          const { PageDebugHelper } = await import('../utils/pageDebugHelper');
          debugInfo = await PageDebugHelper.captureDebugInfo(page);
        }
      }
      if (!debugInfo) {
        debugInfo = executor.getStoredDebugInfo?.() ?? null;
      }
      if (!debugInfo) {
        return res.status(404).json({
          success: false,
          message: 'No captured DOM available for this execution',
        });
      }
      res.json({ success: true, debugInfo });
    } catch (error: any) {
      console.error('Get captured DOM error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get captured DOM',
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/selector-finder/start:
   *   post:
   *     summary: Start selector finder session
   *     description: Start a selector finder session to help identify selectors for workflow nodes. Can attach to existing paused execution or create new browser session.
   *     tags: [Workflows]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - nodeId
   *               - fieldName
   *             properties:
   *               nodeId:
   *                 type: string
   *                 description: Node ID to find selector for
   *               fieldName:
   *                 type: string
   *                 description: Field name in node to update with selector
   *     responses:
   *       200:
   *         description: Selector finder session started successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SelectorFinderStartResponse'
   *       400:
   *         description: Bad request - missing required fields
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Selector Finder Routes
  router.post('/selector-finder/start', async (req: Request, res: Response) => {
    try {
      const { nodeId, fieldName } = req.body as { nodeId: string; fieldName: string };

      if (!nodeId || !fieldName) {
        return res.status(400).json({ error: 'nodeId and fieldName are required' });
      }

      // Check if there's a paused execution with an active browser
      const mostRecentId = executionManager.getMostRecentExecutionId();
      if (mostRecentId) {
        const executor = executionManager.getExecutor(mostRecentId);
        if (executor && executor.isExecutionPaused()) {
          // Use context to get page instead of accessing private playwright property
          const page = (executor as any).context?.getPage();
          
          if (page && !page.isClosed()) {
            const sessionManager = SelectorSessionManager.getInstance();
            sessionManager.setIO(io);
            sessionManager.setCurrentTarget(nodeId, fieldName);
            
            // Attach to existing page
            const executionId = executor.getExecutionId();
            sessionManager.attachToExistingPage(page, `execution-${executionId}`);
          
          // Refresh the page with timeout and more lenient wait condition
          // Use 'load' instead of 'networkidle' to avoid timeout on pages with continuous network activity
          // 'networkidle' waits for network to be idle for 500ms, which can timeout on pages with continuous requests
          try {
            await page.reload({ 
              waitUntil: 'load', 
              timeout: 30000 
            });
          } catch (error: any) {
            // If reload times out, try with domcontentloaded as fallback (faster, less strict)
            if (error.message && (error.message.includes('timeout') || error.message.includes('Timeout'))) {
              console.warn('Page reload with "load" timed out, trying "domcontentloaded"');
              try {
                await page.reload({ 
                  waitUntil: 'domcontentloaded', 
                  timeout: 15000 
                });
              } catch (fallbackError: any) {
                console.warn('Page reload failed, continuing anyway - page may still be usable:', fallbackError.message);
                // Continue even if reload fails - page might still be usable for selector finder
              }
            } else {
              // Re-throw if it's not a timeout error
              throw error;
            }
          }
          
          // Bring browser to foreground
          await page.bringToFront();
          
          // Inject finder overlay
          const context = page.context();
          await FinderInjector.injectFinder(page, io, nodeId, fieldName, context);
          
          // Bring to foreground again after injection
          await page.bringToFront();
          
          return res.json({
            sessionId: `execution-${executionId}`,
            pageUrl: page.url(),
          });
          }
        }
      }
      
      // Fallback to current behavior: create new session
      const sessionManager = SelectorSessionManager.getInstance();
      sessionManager.setIO(io);
      sessionManager.setCurrentTarget(nodeId, fieldName); // Store nodeId and fieldName in session manager

      const { page, sessionId } = await sessionManager.getOrCreateSession();
      const context = page.context();

      // Bring browser window to front BEFORE injection
      await sessionManager.bringToForeground();
      
      // Inject finder if not already injected
      try {
        await FinderInjector.injectFinder(page, io, nodeId, fieldName, context);
        
        // Bring browser window to front AGAIN after injection to ensure it's visible
        await sessionManager.bringToForeground();
        
        // Wait a bit and bring to front one more time
        setTimeout(async () => {
          await sessionManager.bringToForeground();
        }, 500);
      } catch (error: any) {
        console.warn('Finder already injected or injection failed:', error.message);
      }

      // Bring browser to foreground
      await sessionManager.bringToForeground();

      const pageUrl = page.url();

      res.json({
        sessionId,
        pageUrl,
      });
    } catch (error: any) {
      console.error('Start selector finder error:', error);
      res.status(500).json({
        error: 'Failed to start selector finder',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/selector-finder/stop:
   *   post:
   *     summary: Stop selector finder session
   *     description: Close the active selector finder session and browser
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Selector finder session stopped successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/selector-finder/stop', async (req: Request, res: Response) => {
    try {
      const sessionManager = SelectorSessionManager.getInstance();
      await sessionManager.closeSession();

      res.json({
        success: true,
        message: 'Selector finder session closed',
      });
    } catch (error: any) {
      console.error('Stop selector finder error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/selector-finder/status:
   *   get:
   *     summary: Get selector finder status
   *     description: Check if selector finder session is active
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Selector finder status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SelectorFinderStatusResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/selector-finder/status', async (req: Request, res: Response) => {
    try {
      const sessionManager = SelectorSessionManager.getInstance();
      const session = sessionManager.getSession();

      if (session) {
        const pageUrl = session.page.url();
        res.json({
          active: true,
          sessionId: session.sessionId,
          pageUrl,
        });
      } else {
        res.json({
          active: false,
          sessionId: null,
          pageUrl: null,
        });
      }
    } catch (error: any) {
      console.error('Get selector finder status error:', error);
      res.status(500).json({
        error: 'Failed to get selector finder status',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/selector-finder/selectors:
   *   post:
   *     summary: Submit selected selector
   *     description: Submit the selected selector option to update the node field
   *     tags: [Workflows]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - selectors
   *               - selectedIndex
   *               - nodeId
   *               - fieldName
   *             properties:
   *               selectors:
   *                 type: array
   *                 items:
   *                   $ref: '#/components/schemas/SelectorOption'
   *               selectedIndex:
   *                 type: integer
   *                 description: Index of selected selector in array
   *               nodeId:
   *                 type: string
   *               fieldName:
   *                 type: string
   *     responses:
   *       200:
   *         description: Selector submitted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 selector:
   *                   $ref: '#/components/schemas/SelectorOption'
   *       400:
   *         description: Bad request - invalid parameters
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/selector-finder/selectors', async (req: Request, res: Response) => {
    try {
      const { selectors, selectedIndex, nodeId, fieldName } = req.body as {
        selectors: SelectorOption[];
        selectedIndex: number;
        nodeId: string;
        fieldName: string;
      };

      if (!selectors || selectedIndex === undefined || !nodeId || !fieldName) {
        return res.status(400).json({ error: 'selectors, selectedIndex, nodeId, and fieldName are required' });
      }

      if (selectedIndex < 0 || selectedIndex >= selectors.length) {
        return res.status(400).json({ error: 'Invalid selectedIndex' });
      }

      const selectedSelector = selectors[selectedIndex];

      // Emit Socket.IO event to frontend
      io.emit('selector-finder-event', {
        event: 'selectors-generated',
        selectors,
        nodeId,
        fieldName,
        selectedSelector,
      } as SelectorFinderEvent);

      res.json({
        success: true,
        message: 'Selector selected',
        selector: selectedSelector,
      });
    } catch (error: any) {
      console.error('Select selector error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/selector-finder/generate:
   *   post:
   *     summary: Generate selectors
   *     description: Initiate selector generation for clicked element (called from browser context)
   *     tags: [Workflows]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - nodeId
   *               - fieldName
   *               - elementInfo
   *             properties:
   *               nodeId:
   *                 type: string
   *               fieldName:
   *                 type: string
   *               elementInfo:
   *                 type: object
   *                 description: Element information from browser
   *     responses:
   *       200:
   *         description: Selector generation initiated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Bad request - no active session
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Handle element click and selector generation
  // This will be called from the browser context via exposeFunction
  router.post('/selector-finder/generate', async (req: Request, res: Response) => {
    try {
      const { nodeId, fieldName, elementInfo } = req.body as {
        nodeId: string;
        fieldName: string;
        elementInfo: any;
      };

      const sessionManager = SelectorSessionManager.getInstance();
      const session = sessionManager.getSession();

      if (!session) {
        return res.status(400).json({ error: 'No active selector finder session' });
      }

      // Generate selectors will be handled by the exposed function in finderInjector
      // The selectors will be sent back via the exposeFunction callback
      res.json({
        success: true,
        message: 'Selector generation initiated',
      });
    } catch (error: any) {
      console.error('Generate selectors error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/builder-mode/start:
   *   post:
   *     summary: Start builder mode
   *     description: Start builder mode to record user actions and generate workflow nodes
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Builder mode started successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessionId:
   *                   type: string
   *                 pageUrl:
   *                   type: string
   *       400:
   *         description: Bad request - no active browser session
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Builder Mode Routes
  router.post('/builder-mode/start', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      sessionManager.setIO(io);
      
      const page = sessionManager.getPage();
      
      if (!page) {
        return res.status(400).json({ error: 'No active browser session for builder mode' });
      }

      // Inject overlay
      await ActionRecorderInjector.injectActionRecorderOverlay(page, io);

      const sessionId = sessionManager.getSessionId();
      const pageUrl = page.url();

      res.json({
        sessionId,
        pageUrl,
      });
    } catch (error: any) {
      console.error('Start builder mode error:', error);
      res.status(500).json({
        error: 'Failed to start builder mode',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/builder-mode/stop:
   *   post:
   *     summary: Stop builder mode
   *     description: Stop builder mode and stop recording actions
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Builder mode stopped successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/builder-mode/stop', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      const page = sessionManager.getPage();
      
      if (page) {
        await ActionRecorderInjector.stopWebhookListening(page);
      }
      
      sessionManager.stopRecording('user');

      res.json({
        success: true,
        message: 'Builder mode stopped',
      });
    } catch (error: any) {
      console.error('Stop builder mode error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/builder-mode/status:
   *   get:
   *     summary: Get builder mode status
   *     description: Check if builder mode is active and if recording is in progress
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Builder mode status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/BuilderModeStatusResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/builder-mode/status', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      const page = sessionManager.getPage();

      if (page && sessionManager.isSessionActive()) {
        const pageUrl = page.url();
        res.json({
          active: true,
          recording: sessionManager.isRecording(),
          sessionId: sessionManager.getSessionId(),
          pageUrl,
        });
      } else {
        res.json({
          active: false,
          recording: false,
          sessionId: null,
          pageUrl: null,
        });
      }
    } catch (error: any) {
      console.error('Get builder mode status error:', error);
      res.status(500).json({
        error: 'Failed to get builder mode status',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/builder-mode/actions:
   *   get:
   *     summary: Get recorded actions
   *     description: Retrieve all actions recorded during builder mode session
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Recorded actions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/RecordedAction'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/builder-mode/actions', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      const actions = sessionManager.getActions();

      res.json(actions);
    } catch (error: any) {
      console.error('Get builder mode actions error:', error);
      res.status(500).json({
        error: 'Failed to get builder mode actions',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/builder-mode/actions/reset:
   *   post:
   *     summary: Reset recorded actions
   *     description: Clear all recorded actions from builder mode session
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Actions reset successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/builder-mode/actions/reset', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      sessionManager.resetActions();

      res.json({
        success: true,
        message: 'Actions reset',
      });
    } catch (error: any) {
      console.error('Reset builder mode actions error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/builder-mode/webhook/start:
   *   post:
   *     summary: Start webhook listening
   *     description: Start listening for webhook events to record actions in builder mode
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Webhook listening started successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessionId:
   *                   type: string
   *                 pageUrl:
   *                   type: string
   *       400:
   *         description: Bad request - no active browser session
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/builder-mode/webhook/start', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      sessionManager.setIO(io);
      
      const page = sessionManager.getPage();
      if (!page) {
        return res.status(400).json({ error: 'No active browser session for builder mode' });
      }

      // Start webhook listening
      await ActionRecorderInjector.startWebhookListening(page, io);
      sessionManager.startRecording();

      const sessionId = sessionManager.getSessionId();
      const pageUrl = page.url();

      res.json({
        sessionId,
        pageUrl,
      });
    } catch (error: any) {
      console.error('Start webhook listening error:', error);
      res.status(500).json({
        error: 'Failed to start webhook listening',
        message: error.message,
      });
    }
  });

  /**
   * @swagger
   * /api/workflows/builder-mode/webhook/stop:
   *   post:
   *     summary: Stop webhook listening
   *     description: Stop listening for webhook events and stop recording actions
   *     tags: [Workflows]
   *     responses:
   *       200:
   *         description: Webhook listening stopped successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/builder-mode/webhook/stop', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      const page = sessionManager.getPage();
      
      if (page) {
        await ActionRecorderInjector.stopWebhookListening(page);
      }
      
      sessionManager.stopRecording('user');

      res.json({
        success: true,
        message: 'Webhook listening stopped',
      });
    } catch (error: any) {
      console.error('Stop webhook listening error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
}

