import { Workflow, ExecutionStatus, ExecutionEventType, ExecutionEvent, BaseNode, Edge, NodeType, PropertyDataType, ScreenshotConfig, ReportConfig, StartNodeData, BreakpointConfig } from '@automflows/shared';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowParser } from './parser';
import { ContextManager } from './context';
import { PlaywrightManager } from '../utils/playwright';
import * as nodeHandlers from '../nodes';
import { TypeConverter } from '../utils/typeConverter';
import { PageDebugHelper } from '../utils/pageDebugHelper';
import { ExecutionTracker } from '../utils/executionTracker';
import { ReportGenerator } from '../utils/reportGenerator';
import { enforceReportRetention } from '../utils/reportRetention';
import { getAllReusableScopes } from '../utils/reusableFlowExtractor';
import { resolveFromProjectRoot } from '../utils/pathUtils';
import { migrateWorkflow } from '../utils/migration';
import { ActionRecorderSessionManager } from '../utils/actionRecorderSessionManager';
import { Logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

export class Executor {
  private executionId: string;
  private workflow: Workflow;
  private parser: WorkflowParser;
  private context: ContextManager;
  private playwright: PlaywrightManager;
  private io: Server;
  private status: ExecutionStatus = ExecutionStatus.IDLE;
  private currentNodeId: string | null = null;
  private error: string | null = null;
  private stopRequested: boolean = false;
  private traceLogs: boolean;
  private nodeTraceLogs: Map<string, string[]> = new Map(); // Store trace logs per node
  private screenshotConfig?: ScreenshotConfig;
  private reportConfig?: ReportConfig;
  private executionTracker?: ExecutionTracker;
  private recordSession: boolean;
  private breakpointConfig?: BreakpointConfig;
  private builderModeEnabled: boolean = false;
  private logger?: Logger;
  private slowMo: number = 0; // Delay in milliseconds between node executions
  // Pause state
  private isPaused: boolean = false;
  private pausedNodeId: string | null = null;
  private pauseReason: 'wait-pause' | 'breakpoint' | null = null;
  private pauseResolve: (() => void) | null = null;
  private pauseReject: ((error: Error) => void) | null = null;
  private pausePromise: Promise<void> | null = null;
  private skipNextNode: boolean = false;

  constructor(
    workflow: Workflow, 
    io: Server, 
    traceLogs: boolean = false,
    screenshotConfig?: ScreenshotConfig,
    reportConfig?: ReportConfig,
    recordSession: boolean = false,
    breakpointConfig?: BreakpointConfig,
    builderModeEnabled: boolean = false
  ) {
    this.executionId = uuidv4();
    
    // Migrate old nodes to new consolidated format before execution
    const migrationResult = migrateWorkflow(workflow);
    if (migrationResult.warnings.length > 0) {
      // Log migration warnings
      console.warn('[Migration] Workflow migration warnings:');
      migrationResult.warnings.forEach(warning => {
        console.warn(`[Migration] ${warning}`);
      });
    }
    
    this.workflow = { ...workflow, nodes: migrationResult.nodes };
    this.io = io;
    this.traceLogs = traceLogs;
    this.recordSession = recordSession;
    this.reportConfig = reportConfig;
    this.breakpointConfig = breakpointConfig;
    this.builderModeEnabled = builderModeEnabled;
    this.parser = new WorkflowParser(this.workflow);
    this.context = new ContextManager();
    
    // Extract Start node and read screenshot config and slowmo from it
    const startNode = workflow.nodes.find(node => node.type === NodeType.START);
    if (startNode) {
      const startNodeData = startNode.data as StartNodeData;
      if (startNodeData.screenshotAllNodes) {
        this.screenshotConfig = {
          enabled: true,
          timing: startNodeData.screenshotTiming || 'post'
        };
      } else {
        this.screenshotConfig = undefined;
      }
      // Extract slowmo setting from Start node
      this.slowMo = startNodeData.slowMo || 0;
      // Extract scrollThenAction setting from Start node and store in context
      const scrollThenAction = startNodeData.scrollThenAction || false;
      this.context.setData('scrollThenAction', scrollThenAction);
    } else {
      // Fallback to passed screenshotConfig if no Start node found
      this.screenshotConfig = screenshotConfig;
      this.slowMo = 0;
      this.context.setData('scrollThenAction', false);
    }
    
    // Initialize execution tracker if screenshots, reporting, or recording is enabled
    const shouldCreateTracker = (this.screenshotConfig?.enabled) || (reportConfig?.enabled) || recordSession;
    if (shouldCreateTracker) {
      // Use report config output path if available, otherwise default to './output'
      // Path will be resolved relative to project root in ExecutionTracker
      const outputPath = reportConfig?.outputPath || './output';
      this.executionTracker = new ExecutionTracker(this.executionId, workflow, outputPath);
      
      // Store directory paths in context for node handlers
      this.context.setData('outputDirectory', this.executionTracker.getOutputDirectory());
      this.context.setData('screenshotsDirectory', this.executionTracker.getScreenshotsDirectory());
      
      // Initialize PlaywrightManager with screenshots directory, videos directory, and recording flag
      this.playwright = new PlaywrightManager(
        this.executionTracker.getScreenshotsDirectory(),
        this.executionTracker.getVideosDirectory(),
        this.recordSession
      );
    } else {
      // If recording is enabled but no tracker, create videos directory
      if (this.recordSession) {
        const videosDir = resolveFromProjectRoot('./output/videos');
        if (!fs.existsSync(videosDir)) {
          fs.mkdirSync(videosDir, { recursive: true });
        }
        this.playwright = new PlaywrightManager(undefined, videosDir, this.recordSession);
      } else {
        this.playwright = new PlaywrightManager();
      }
    }

    // Set logger on PlaywrightManager for browser console log capture
    if (this.logger) {
      this.playwright.setLogger(this.logger);
    }
    
    // Store playwright in context for node handlers
    (this.context as any).playwright = this.playwright;
    
    // Store workflow in context for node handlers (needed for RunReusableHandler)
    (this.context as any).workflow = this.workflow;
    
    // Store recordSession flag in context for PlaywrightManager
    (this.context as any).recordSession = this.recordSession;

    // Initialize logger if traceLogs is enabled
    if (this.traceLogs) {
      const workflowName = this.extractWorkflowName(this.workflow);
      this.logger = new Logger();
      this.logger.initialize(workflowName, this.traceLogs);
    }
  }

  /**
   * Extract workflow name from workflow (similar to ExecutionTracker)
   */
  private extractWorkflowName(workflow: Workflow): string {
    // Try to find a Start node and use its label, or use default
    const startNode = workflow.nodes.find(node => node.type === NodeType.START);
    if (startNode && (startNode.data as any)?.label) {
      // Use start node label, sanitized for filesystem
      return (startNode.data as any).label.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'workflow';
    }
    return 'workflow';
  }

  getExecutionId(): string {
    return this.executionId;
  }

  getStatus(): ExecutionStatus {
    return this.status;
  }

  getCurrentNodeId(): string | null {
    return this.currentNodeId;
  }

  getError(): string | null {
    return this.error;
  }

  getPausedNodeId(): string | null {
    return this.pausedNodeId;
  }

  getPauseReason(): 'wait-pause' | 'breakpoint' | null {
    return this.pauseReason;
  }

  isExecutionPaused(): boolean {
    return this.isPaused;
  }

  async pauseExecution(nodeId: string, reason: 'wait-pause' | 'breakpoint'): Promise<void> {
    if (this.isPaused) {
      return; // Already paused
    }

    this.isPaused = true;
    this.pausedNodeId = nodeId;
    this.pauseReason = reason;

    // Emit pause event
    this.emitEvent({
      type: ExecutionEventType.EXECUTION_PAUSED,
      nodeId,
      message: `Execution paused: ${reason}`,
      data: { reason },
      timestamp: Date.now(),
    });

    // Create promise that resolves when continue is called
    this.pausePromise = new Promise<void>((resolve, reject) => {
      this.pauseResolve = resolve;
      this.pauseReject = reject;
    });

    // Wait for continue signal
    await this.pausePromise;
  }

  continueExecution(): void {
    if (!this.isPaused || !this.pauseResolve) {
      return;
    }

    this.isPaused = false;
    const resolve = this.pauseResolve;
    this.pauseResolve = null;
    this.pauseReject = null;
    this.pausePromise = null;
    this.pausedNodeId = null;
    this.pauseReason = null;

    resolve();
  }

  stopExecutionFromPause(): void {
    if (!this.isPaused || !this.pauseReject) {
      return;
    }

    this.isPaused = false;
    const reject = this.pauseReject;
    this.pauseResolve = null;
    this.pauseReject = null;
    this.pausePromise = null;
    this.pausedNodeId = null;
    this.pauseReason = null;
    this.stopRequested = true;

    reject(new Error('Execution stopped by user'));
  }

  skipNextNodeExecution(): void {
    this.skipNextNode = true;
    this.continueExecution();
  }

  disableBreakpointAndContinue(): void {
    if (this.breakpointConfig) {
      this.breakpointConfig.enabled = false;
    }
    this.continueExecution();
  }

  /**
   * Check if breakpoint should trigger for a node
   */
  private shouldTriggerBreakpoint(node: BaseNode, timing: 'pre' | 'post'): boolean {
    if (!this.breakpointConfig || !this.breakpointConfig.enabled) {
      return false;
    }

    const breakpointAt = this.breakpointConfig.breakpointAt;
    
    // Check if timing matches
    if (breakpointAt !== timing && breakpointAt !== 'both') {
      return false;
    }

    const breakpointFor = this.breakpointConfig.breakpointFor;
    
    // If breakpointFor is 'all', always trigger
    if (breakpointFor === 'all') {
      return true;
    }

    // If breakpointFor is 'marked', check if node has breakpoint property
    if (breakpointFor === 'marked') {
      const nodeData = node.data as any;
      return nodeData?.breakpoint === true;
    }

    return false;
  }

  async execute(): Promise<void> {
    try {
      // Validate workflow
      const validation = this.parser.validate();
      if (!validation.valid) {
        const errorMsg = validation.errors.join(', ');
        const warningMsg = validation.warnings && validation.warnings.length > 0 ? ` Warnings: ${validation.warnings.join(', ')}` : '';
        throw new Error(`Workflow validation failed: ${errorMsg}${warningMsg}`);
      }
      
      // Log warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        this.traceLog(`[TRACE] Validation warnings: ${validation.warnings.join(', ')}`);
      }

      // Store workflow and reusable scopes in context for RunReusableHandler
      this.context.setData('fullWorkflow', this.workflow);
      this.context.setData('reusableScopes', this.parser.getReusableScopes());
      this.context.setData('resolvePropertyInputs', (node: BaseNode) => this.resolvePropertyInputs(node));
      // Store trace logging function for RunReusableHandler to use
      this.context.setData('traceLog', (message: string) => this.traceLog(message));
      this.context.setData('emitEvent', (event: ExecutionEvent) => this.emitEvent(event));
      this.context.setData('setCurrentNodeId', (nodeId: string | null) => { this.currentNodeId = nodeId; });
      this.context.setData('getCurrentNodeId', () => this.currentNodeId);
      this.context.setData('traceLogs', this.traceLogs);
      this.context.setData('pauseExecution', (nodeId: string, reason: 'wait-pause' | 'breakpoint') => this.pauseExecution(nodeId, reason));

      this.status = ExecutionStatus.RUNNING;
      const workflowName = this.extractWorkflowName(this.workflow);
      this.traceLog(`[TRACE] Execution started - ${workflowName}`);
      this.emitEvent({
        type: ExecutionEventType.EXECUTION_START,
        timestamp: Date.now(),
      });

      // Get execution order (excludes nodes in reusable scopes)
      const executionOrder = this.parser.getExecutionOrder(true);
      this.traceLog(`[TRACE] Execution order: ${executionOrder.join(' -> ')}`);

      // Track skipped nodes (nodes unreachable due to switch node branching)
      const skippedNodes = new Set<string>();
      
      // Get reusable scopes to identify which nodes to skip
      const reusableScopes = getAllReusableScopes(this.workflow);
      const nodesInReusableScopes = new Set<string>();
      for (const scope of reusableScopes.values()) {
        for (const nodeId of scope) {
          nodesInReusableScopes.add(nodeId);
        }
      }

        // Execute nodes in order
        for (const nodeId of executionOrder) {
        if (this.stopRequested) {
          this.status = ExecutionStatus.STOPPED;
          const workflowName = this.extractWorkflowName(this.workflow);
          this.traceLog(`[TRACE] Execution cancelled - ${workflowName}`);
          this.emitEvent({
            type: ExecutionEventType.EXECUTION_ERROR,
            message: 'Execution stopped by user',
            timestamp: Date.now(),
          });
          return;
        }

        const node = this.parser.getNode(nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }

        // Skip Reusable and End nodes (they're just definitions/markers)
        if (node.type === 'reusable.reusable' || node.type === 'reusable.end') {
          this.traceLog(`[TRACE] Skipping reusable definition/marker node: ${nodeId} (type: ${node.type})`);
          
          // Record node skipped in tracker
          if (this.executionTracker) {
            this.executionTracker.recordNodeStart(node);
            this.executionTracker.recordNodeBypassed(nodeId);
          }
          
          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            message: 'Node skipped (reusable definition/marker)',
            timestamp: Date.now(),
          });
          continue;
        }
        
        // Skip nodes that belong to reusable scopes (they're executed via Run Reusable)
        if (nodesInReusableScopes.has(nodeId)) {
          this.traceLog(`[TRACE] Skipping node in reusable scope: ${nodeId} (type: ${node.type})`);
          
          // Record node skipped in tracker
          if (this.executionTracker) {
            this.executionTracker.recordNodeStart(node);
            this.executionTracker.recordNodeBypassed(nodeId);
          }
          
          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            message: 'Node skipped (in reusable scope)',
            timestamp: Date.now(),
          });
          continue;
        }

        // Check if node is skipped due to switch node branching
        if (skippedNodes.has(nodeId)) {
          this.traceLog(`[TRACE] Skipping unreachable node: ${nodeId} (type: ${node.type})`);
          
          // Record node skipped in tracker
          if (this.executionTracker) {
            this.executionTracker.recordNodeStart(node);
            this.executionTracker.recordNodeBypassed(nodeId);
          }
          
          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            message: 'Node skipped (unreachable branch)',
            timestamp: Date.now(),
          });
          continue;
        }

        // Check if node is bypassed
        const nodeData = node.data as any;
        if (nodeData?.bypass === true) {
          this.traceLog(`[TRACE] Skipping bypassed node: ${nodeId} (type: ${node.type})`);
          
          // Record node bypassed in tracker
          if (this.executionTracker) {
            this.executionTracker.recordNodeStart(node);
            this.executionTracker.recordNodeBypassed(nodeId);
          }
          
          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            message: 'Node bypassed',
            timestamp: Date.now(),
          });
          continue;
        }

        // Check for pre-execution breakpoint
        if (this.shouldTriggerBreakpoint(node, 'pre')) {
          this.traceLog(`[TRACE] Pre-execution breakpoint triggered for node: ${nodeId}`);
          await this.pauseExecution(nodeId, 'breakpoint');
          this.emitEvent({
            type: ExecutionEventType.BREAKPOINT_TRIGGERED,
            nodeId,
            message: 'Breakpoint triggered (pre-execution)',
            data: { breakpointAt: 'pre' },
            timestamp: Date.now(),
          });
          
          // If skip was requested, skip this node
          if (this.skipNextNode) {
            this.skipNextNode = false;
            this.traceLog(`[TRACE] Skipping node due to breakpoint skip: ${nodeId}`);
            continue;
          }
        }

        this.currentNodeId = nodeId;
        // Clear trace logs for this node at start
        this.nodeTraceLogs.set(nodeId, []);
        this.traceLog(`[TRACE] Starting node: ${nodeId} (type: ${node.type})`);
        if (this.traceLogs && node.data) {
          this.traceLog(`[TRACE] Node config: ${JSON.stringify(node.data, null, 2)}`);
        }
        
        // Record node start in tracker
        if (this.executionTracker) {
          this.executionTracker.recordNodeStart(node);
        }
        
        this.emitEvent({
          type: ExecutionEventType.NODE_START,
          nodeId,
          timestamp: Date.now(),
        });

        // Take pre-execution screenshot if enabled
        if (this.screenshotConfig?.enabled && 
            (this.screenshotConfig.timing === 'pre' || this.screenshotConfig.timing === 'both')) {
          await this.takeNodeScreenshot(nodeId, 'pre');
        }

        try {
          // Resolve property input connections before execution
          const resolvedNode = this.resolvePropertyInputs(node);
          
          // Get handler for node type
          const handler = nodeHandlers.getNodeHandler(resolvedNode.type);
          if (!handler) {
            throw new Error(`No handler found for node type: ${resolvedNode.type}`);
          }

          // Execute node with resolved data
          this.traceLog(`[TRACE] Executing node handler for: ${resolvedNode.type}`);
          await handler.execute(resolvedNode, this.context);
          this.traceLog(`[TRACE] Node ${nodeId} completed successfully`);

          // Apply slowmo delay if enabled (skip delay for last node)
          if (this.slowMo > 0 && nodeId !== executionOrder[executionOrder.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, this.slowMo));
          }

          // Check if this is a switch node and handle conditional branching
          if (resolvedNode.type === 'switch.switch') {
            const selectedHandle = this.context.getData('switchOutput') as string | undefined;
            if (selectedHandle) {
              this.traceLog(`[TRACE] Switch node ${nodeId} selected handle: ${selectedHandle}`);
              
              // Get all output handles for this switch node
              const allHandles = this.parser.getSwitchOutputHandles(nodeId);
              
              // Mark nodes from unselected handles as skipped
              for (const handle of allHandles) {
                if (handle !== selectedHandle) {
                  const unreachableNodes = this.parser.getNodesReachableFromHandle(nodeId, handle);
                  for (const unreachableNodeId of unreachableNodes) {
                    skippedNodes.add(unreachableNodeId);
                    this.traceLog(`[TRACE] Marking node ${unreachableNodeId} as skipped (unreachable from handle ${handle})`);
                  }
                }
              }
            }
          }

          // Clear trace logs on success (we only need them for errors)
          this.nodeTraceLogs.delete(nodeId);

          // Record screenshot if this is a Screenshot node
          if (resolvedNode.type === NodeType.SCREENSHOT && this.executionTracker) {
            const screenshotPath = this.context.getData('screenshotPath') as string | undefined;
            if (screenshotPath) {
              // Record as 'post' since screenshot is taken during node execution
              this.executionTracker.recordScreenshot(nodeId, screenshotPath, 'post');
            }
          }

          // Take post-execution screenshot if enabled
          if (this.screenshotConfig?.enabled && 
              (this.screenshotConfig.timing === 'post' || this.screenshotConfig.timing === 'both')) {
            await this.takeNodeScreenshot(nodeId, 'post');
          }

          // Record node completion in tracker
          if (this.executionTracker) {
            this.executionTracker.recordNodeComplete(nodeId);
          }

          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            timestamp: Date.now(),
          });

          // Check for post-execution breakpoint
          if (this.shouldTriggerBreakpoint(node, 'post')) {
            this.traceLog(`[TRACE] Post-execution breakpoint triggered for node: ${nodeId}`);
            await this.pauseExecution(nodeId, 'breakpoint');
            this.emitEvent({
              type: ExecutionEventType.BREAKPOINT_TRIGGERED,
              nodeId,
              message: 'Breakpoint triggered (post-execution)',
              data: { breakpointAt: 'post' },
              timestamp: Date.now(),
            });
          }
        } catch (error: any) {
          this.error = error.message;
          this.traceLog(`[TRACE] Node ${nodeId} failed: ${error.message}`);
          
          // Get trace logs for this node
          const traceLogs = this.nodeTraceLogs.get(nodeId) || [];
          
          // Capture debug info for UI nodes
          let debugInfo;
          if (this.isUINode(node)) {
            try {
              const page = this.context.getPage();
              if (page) {
                const selectorInfo = this.extractSelectorInfo(node);
                debugInfo = await PageDebugHelper.captureDebugInfo(
                  page,
                  selectorInfo.selector,
                  selectorInfo.selectorType || 'css'
                );
              }
            } catch (debugError: any) {
              // Don't fail the error reporting if debug capture fails
              console.warn(`Failed to capture debug info for node ${nodeId}: ${debugError.message}`);
            }
          }
          
          // Add screenshot paths to debug info if available (for all node types)
          if (this.executionTracker) {
            if (!debugInfo) {
              debugInfo = {};
            }
            const metadata = this.executionTracker.getMetadata();
            const nodeEvent = metadata.nodes.find(n => n.nodeId === nodeId);
            if (nodeEvent && nodeEvent.screenshotPaths) {
              debugInfo.screenshotPaths = nodeEvent.screenshotPaths;
              debugInfo.executionFolderName = this.executionTracker.getFolderName();
            }
          }
          
          // Check if node has failSilently enabled
          const nodeData = node.data as any;
          const failSilently = nodeData?.failSilently === true;
          
          this.emitEvent({
            type: ExecutionEventType.NODE_ERROR,
            nodeId,
            message: error.message,
            traceLogs: traceLogs,
            debugInfo: debugInfo,
            failSilently: failSilently,
            timestamp: Date.now(),
          });
          
          // Record node error in tracker
          if (this.executionTracker) {
            this.executionTracker.recordNodeError(nodeId, error.message);
          }
          
          // If failSilently is enabled, continue execution instead of throwing
          if (failSilently) {
            this.traceLog(`[TRACE] Node ${nodeId} failed silently, continuing execution`);
            // Don't emit NODE_COMPLETE - keep node in 'error' status for reporting
            // Execution continues to next node, but node remains marked as failed
            continue; // Continue to next node
          }
          
          // Otherwise, throw error to stop execution
          throw error;
        }
      }

      // Check if builder mode is enabled - if so, keep browser open
      if (this.builderModeEnabled) {
        this.traceLog(`[TRACE] Builder mode enabled - keeping browser open`);
        
        // Get the last node ID
        const lastNodeId = executionOrder[executionOrder.length - 1];
        
        // Get page and context from context manager
        const page = this.context.getPage();
        const browserContext = this.context.getBrowserContext(); // Gets browser context
        
        if (page && browserContext) {
          // Set page in action recorder session manager
          const sessionManager = ActionRecorderSessionManager.getInstance();
          sessionManager.setIO(this.io);
          sessionManager.setPageFromExecution(page, browserContext, this.executionId);
          
          // Emit builder mode ready event
          this.emitEvent({
            type: ExecutionEventType.BUILDER_MODE_READY,
            nodeId: lastNodeId,
            timestamp: Date.now(),
          });
          
          // Keep execution status as running (don't complete)
          // Browser stays open, user can switch to it and start recording
          this.traceLog(`[TRACE] Builder mode ready - browser session available for action recording`);
          return; // Exit without completing execution
        } else {
          this.traceLog(`[TRACE] Builder mode enabled but no browser session found`);
        }
      }
      
      this.status = ExecutionStatus.COMPLETED;
      this.currentNodeId = null;
      this.traceLog(`[TRACE] Execution done - ${workflowName}`);
      
      // Record videos before generating reports (videos are finalized when browser closes)
      await this.recordVideos();
      
      // Complete execution in tracker
      if (this.executionTracker) {
        this.executionTracker.completeExecution('completed');
      }
      
      // Generate reports if enabled
      if (this.reportConfig?.enabled && this.executionTracker) {
        await this.generateReports();
      }
      
      this.emitEvent({
        type: ExecutionEventType.EXECUTION_COMPLETE,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      this.status = ExecutionStatus.ERROR;
      this.error = error.message;
      const workflowName = this.extractWorkflowName(this.workflow);
      this.traceLog(`[TRACE] Execution failed - ${workflowName}: ${error.message}`);
      
      // Record videos before generating reports (videos are finalized when browser closes)
      await this.recordVideos();
      
      // Complete execution with error status in tracker
      if (this.executionTracker) {
        this.executionTracker.completeExecution('error');
      }
      
      // Generate reports even on error if enabled
      if (this.reportConfig?.enabled && this.executionTracker) {
        await this.generateReports();
      }
      
      this.emitEvent({
        type: ExecutionEventType.EXECUTION_ERROR,
        message: error.message,
        timestamp: Date.now(),
      });
    } finally {
      // Cleanup
      this.traceLog(`[TRACE] Cleaning up execution`);
      await this.cleanup();
    }
  }

  async stop(): Promise<void> {
    this.stopRequested = true;
    await this.cleanup();
  }

  private async takeNodeScreenshot(nodeId: string, timing: 'pre' | 'post'): Promise<void> {
    try {
      const page = this.context.getPage();
      if (!page) {
        return; // No page available, skip screenshot
      }

      const fileName = `${nodeId}-${timing}-${Date.now()}.png`;
      const screenshotPath = await this.playwright.takeScreenshot(fileName, false);
      
      // Record screenshot in tracker
      if (this.executionTracker) {
        this.executionTracker.recordScreenshot(nodeId, screenshotPath, timing);
      }
    } catch (error: any) {
      // Don't fail execution if screenshot fails
      console.warn(`Failed to take ${timing} screenshot for node ${nodeId}: ${error.message}`);
    }
  }

  private async generateReports(): Promise<void> {
    if (!this.executionTracker || !this.reportConfig?.reportTypes.length) {
      return;
    }

    try {
      const metadata = this.executionTracker.getMetadata();
      const workflow = this.executionTracker.getWorkflow();
      const reportGenerator = new ReportGenerator(metadata, workflow);
      await reportGenerator.generateReports(this.reportConfig.reportTypes);
      this.traceLog(`[TRACE] Generated reports: ${this.reportConfig.reportTypes.join(', ')}`);
      
      // Enforce report retention after generating reports
      const retentionCount = this.reportConfig.reportRetention ?? 10;
      const outputPath = this.reportConfig.outputPath || './output';
      enforceReportRetention(retentionCount, outputPath);
    } catch (error: any) {
      console.error(`Failed to generate reports: ${error.message}`);
      // Don't fail execution if report generation fails
    }
  }

  private async recordVideos(): Promise<void> {
    // Videos are only finalized when browser context closes
    // We need to close context to get video paths, but this happens before cleanup
    if (!this.playwright || !this.executionTracker) {
      return;
    }
    
    try {
      // Close all contexts from ContextManager
      const allContexts = this.context.getAllContexts();
      for (const [key, browserContext] of Object.entries(allContexts)) {
        try {
          const pages = browserContext.pages();
          // Close all pages first
          for (const page of pages) {
            try {
              await page.close();
            } catch (error) {
              // Page might already be closed
            }
          }
          // Close context to finalize videos
          await browserContext.close();
        } catch (error) {
          // Context might already be closed
        }
      }
      
      // Also handle the default context from PlaywrightManager for backward compatibility
      const playwrightAny = this.playwright as any;
      const context = playwrightAny.context;
      
      if (context) {
        const pages = context.pages();
        
        // Close all pages first
        for (const page of pages) {
          try {
            await page.close();
          } catch (error) {
            // Page might already be closed
          }
        }
        
        // Close context to finalize videos
        try {
          await context.close();
        } catch (error) {
          // Context might already be closed
        }
        
        // Wait longer for videos to be finalized (Playwright needs time to write the file)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mark context as closed in playwright
        playwrightAny.context = null;
        playwrightAny.page = null;
        
        // Find the actual video file - Playwright saves videos in the videos directory
        // The video.path() might return a temp path, so we need to find the actual file
        const videosDirectory = this.executionTracker.getVideosDirectory();
        let finalVideoPath: string | null = null;
        
        // Look for the most recent .webm file in videos directory
        // Playwright saves videos when the context closes, so we check the directory
        if (fs.existsSync(videosDirectory)) {
          const videoFiles = fs.readdirSync(videosDirectory)
            .filter(file => file.endsWith('.webm'))
            .map(file => ({
              name: file,
              path: path.join(videosDirectory, file),
              mtime: fs.statSync(path.join(videosDirectory, file)).mtime.getTime()
            }))
            .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first
          
          if (videoFiles.length > 0) {
            // Use the most recent video file
            finalVideoPath = videoFiles[0].path;
          }
        }
        
        // Record video path - associate with OpenBrowser node if it exists
        if (finalVideoPath && fs.existsSync(finalVideoPath)) {
          const openBrowserNode = this.workflow.nodes.find(
            node => node.type === NodeType.OPEN_BROWSER
          );
          
          if (openBrowserNode) {
            this.executionTracker.recordVideo(openBrowserNode.id, finalVideoPath);
            this.traceLog(`[TRACE] Recorded video: ${finalVideoPath}`);
          }
        } else {
          this.traceLog(`[TRACE] No video file found to record`);
        }
      }
    } catch (error) {
      console.error('Error recording videos:', error);
      this.traceLog(`[TRACE] Error recording videos: ${error}`);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Close logger files
      if (this.logger) {
        await this.logger.close();
      }

      // Don't close browser if builder mode is enabled (browser needs to stay open)
      if (this.builderModeEnabled) {
        // Don't reset context either - we need to keep page/context references
        return;
      }
      
      // Browser and context should already be closed by recordVideos()
      // But close browser if still open
      const playwrightAny = this.playwright as any;
      if (playwrightAny.browser) {
        try {
          await playwrightAny.browser.close();
          playwrightAny.browser = null;
        } catch (error) {
          // Browser might already be closed
        }
      }
    } catch (error) {
      console.error('Error closing playwright:', error);
    }
    this.context.reset();
  }

  private emitEvent(event: ExecutionEvent): void {
    this.io.emit('execution-event', {
      executionId: this.executionId,
      ...event,
    });
  }

  private traceLog(message: string): void {
    if (this.traceLogs) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}`;
      console.log(logMessage);
      
      // Write to logger file (async, non-blocking)
      this.logger?.writeTerminalLog(logMessage);
      
      // Store trace log for current node if executing
      if (this.currentNodeId) {
        const logs = this.nodeTraceLogs.get(this.currentNodeId) || [];
        logs.push(logMessage);
        this.nodeTraceLogs.set(this.currentNodeId, logs);
      }
    }
  }

  /**
   * Check if a node is a UI node that uses selectors
   */
  private isUINode(node: BaseNode): boolean {
    const nodeType = node.type;
    const nodeData = node.data as any;

    // Built-in UI nodes
    if (nodeType === NodeType.ACTION || 
        nodeType === NodeType.TYPE || 
        nodeType === NodeType.ELEMENT_QUERY || 
        nodeType === NodeType.SCREENSHOT) {
      return true;
    }

    // Navigation node with waitForSelector
    if (nodeType === NodeType.NAVIGATION && nodeData?.waitForSelector) {
      return true;
    }

    // Wait node with selector waitType
    if (nodeType === NodeType.WAIT && nodeData?.waitType === 'selector') {
      return true;
    }

    // Plugin nodes that have selector property
    if (nodeData?.selector) {
      return true;
    }

    return false;
  }

  /**
   * Extract selector information from node data
   */
  private extractSelectorInfo(node: BaseNode): { selector?: string; selectorType?: 'css' | 'xpath' } {
    const nodeData = node.data as any;
    const nodeType = node.type;

    // Built-in nodes with selector property
    if (nodeType === NodeType.ACTION || 
        nodeType === NodeType.TYPE || 
        nodeType === NodeType.ELEMENT_QUERY) {
      return {
        selector: nodeData?.selector,
        selectorType: nodeData?.selectorType || 'css',
      };
    }

    // Navigation node with waitForSelector
    if (nodeType === NodeType.NAVIGATION && nodeData?.waitForSelector) {
      return {
        selector: nodeData.waitForSelector,
        selectorType: nodeData.waitForSelectorType || 'css',
      };
    }

    // Wait node with selector waitType
    if (nodeType === NodeType.WAIT && nodeData?.waitType === 'selector') {
      return {
        selector: typeof nodeData.value === 'string' ? nodeData.value : undefined,
        selectorType: nodeData.selectorType || 'css',
      };
    }

    // Plugin nodes
    if (nodeData?.selector) {
      return {
        selector: nodeData.selector,
        selectorType: nodeData.selectorType || 'css',
      };
    }

    return {};
  }

  /**
   * Resolve property input connections for a node
   * Finds edges targeting property handles and resolves their values
   */
  private resolvePropertyInputs(node: BaseNode): BaseNode {
    const nodeData = node.data as any;
    const inputConnections = nodeData._inputConnections || {};
    
    if (Object.keys(inputConnections).length === 0) {
      return node; // No input connections to resolve
    }

    const resolvedData = { ...nodeData };
    const allNodes = this.parser.getAllNodes();
    
    // Resolve each property input connection
    for (const [propertyName, connectionInfo] of Object.entries(inputConnections)) {
      // Check if this property is actually converted to input
      if (!connectionInfo || (connectionInfo as any).isInput !== true) {
        continue;
      }
      
      const handleId = `${propertyName}-input`;
      
      // Find edge connecting to this property handle
      const edge = this.workflow.edges.find(
        e => e.target === node.id && e.targetHandle === handleId
      );
      
      if (edge && edge.source) {
        // Find source node using edge.source
        const sourceNode = allNodes.find(n => n.id === edge.source);
        if (sourceNode) {
          // Get value from source node (it should have been executed already)
          // Value nodes store their value in context with their node ID as key
          const sourceValue = this.context.getVariable(edge.source);
          
          if (sourceValue !== undefined) {
            // Determine source and target types for conversion
            let sourceType: PropertyDataType;
            if (sourceNode.type === NodeType.INT_VALUE) {
              sourceType = PropertyDataType.INT;
            } else if (sourceNode.type === NodeType.STRING_VALUE) {
              sourceType = PropertyDataType.STRING;
            } else if (sourceNode.type === NodeType.BOOLEAN_VALUE) {
              sourceType = PropertyDataType.BOOLEAN;
            } else if (sourceNode.type === NodeType.INPUT_VALUE) {
              // Get dataType from INPUT_VALUE node
              sourceType = (sourceNode.data as any).dataType || PropertyDataType.STRING;
            } else {
              sourceType = TypeConverter.inferType(sourceValue);
            }
            
            // Get target property type (we'll need to infer from property name or use default)
            // For now, use the source type or infer from the value
            let targetType = sourceType;
            
            // Apply type conversion if needed
            try {
              const convertedValue = TypeConverter.convert(sourceValue, sourceType, targetType);
              resolvedData[propertyName] = convertedValue;
              this.traceLog(`[TRACE] Resolved property ${propertyName} = ${convertedValue} (${sourceType} → ${targetType})`);
            } catch (error: any) {
              // If conversion fails, use the value as-is
              resolvedData[propertyName] = sourceValue;
              this.traceLog(`[TRACE] Using unconverted value for ${propertyName}: ${sourceValue}`);
            }
          } else {
            this.traceLog(`[TRACE] Warning: Source value not found for property ${propertyName} from node ${edge.source}`);
          }
        }
      } else {
        this.traceLog(`[TRACE] Warning: No edge found for property input ${propertyName} on node ${node.id}`);
      }
    }
    
    return {
      ...node,
      data: resolvedData,
    };
  }
}

