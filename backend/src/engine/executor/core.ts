import { Workflow, ExecutionStatus, ExecutionEventType, ExecutionEvent, BaseNode, Edge, NodeType, PropertyDataType, ScreenshotConfig, ReportConfig, StartNodeData, BreakpointConfig } from '@automflows/shared';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowParser } from '../parser';
import { ContextManager } from '../context';
import { PlaywrightManager } from '../../utils/playwright';
import * as nodeHandlers from '../../nodes';
import { TypeConverter } from '../../utils/typeConverter';
import { PageDebugHelper } from '../../utils/pageDebugHelper';
import { ExecutionTracker } from '../../utils/executionTracker';
import { enforceReportRetention } from '../../utils/reportRetention';
import { getAllReusableScopes } from '../../utils/reusableFlowExtractor';
import { resolveFromProjectRoot } from '../../utils/pathUtils';
import { migrateWorkflow } from '../../utils/migration';
import { ActionRecorderSessionManager } from '../../utils/actionRecorderSessionManager';
import { Logger } from '../../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

// Import extracted modules
import { extractWorkflowName, isUINode, extractSelectorInfo } from './utils';
import { shouldTriggerBreakpoint } from './breakpoints';
import { takeNodeScreenshot } from './screenshots';
import { generateReports } from './reporting';
import { recordVideos } from './videos';
import { resolvePropertyInputs } from './resolvePropertyInputs';
import { ConditionEvaluator } from '../../utils/conditionEvaluator';
import { JavaScriptCodeHandler } from '../../nodes/logic';

/**
 * Core Executor class for workflow execution
 * This is the main execution engine that orchestrates workflow node execution
 */
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
  private workflowFileName?: string;
  // Pause state
  private isPaused: boolean = false;
  private pausedNodeId: string | null = null;
  private pauseReason: 'wait-pause' | 'breakpoint' | null = null;
  private pauseResolve: (() => void) | null = null;
  private pauseReject: ((error: Error) => void) | null = null;
  private pausePromise: Promise<void> | null = null;
  private skipNextNode: boolean = false;
  // Execution state tracking for runtime workflow updates
  private executedNodeIds: Set<string> = new Set();
  private currentExecutionOrder: string[] = [];
  private executionOrderIndex: number = 0;

  constructor(
    workflow: Workflow, 
    io: Server, 
    traceLogs: boolean = false,
    screenshotConfig?: ScreenshotConfig,
    reportConfig?: ReportConfig,
    recordSession: boolean = false,
    breakpointConfig?: BreakpointConfig,
    builderModeEnabled: boolean = false,
    workflowFileName?: string,
    playwrightManager?: PlaywrightManager  // Optional: provide existing PlaywrightManager for isolation
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
    this.workflowFileName = workflowFileName;
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
    
    // Use provided PlaywrightManager or create new one
    if (playwrightManager) {
      this.playwright = playwrightManager;
    } else {
      // Initialize execution tracker if screenshots, reporting, or recording is enabled
      const shouldCreateTracker = (this.screenshotConfig?.enabled) || (reportConfig?.enabled) || recordSession;
      if (shouldCreateTracker) {
        // Use report config output path if available, otherwise default to './output'
        // Path will be resolved relative to project root in ExecutionTracker
        const outputPath = reportConfig?.outputPath || './output';
        this.executionTracker = new ExecutionTracker(this.executionId, workflow, outputPath, this.workflowFileName);
        
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
    }

    // If PlaywrightManager was provided, still create ExecutionTracker if needed for reports
    if (playwrightManager) {
      const shouldCreateTracker = (this.screenshotConfig?.enabled) || (reportConfig?.enabled) || recordSession;
      if (shouldCreateTracker) {
        const outputPath = reportConfig?.outputPath || './output';
        this.executionTracker = new ExecutionTracker(this.executionId, workflow, outputPath, this.workflowFileName);
        this.context.setData('outputDirectory', this.executionTracker.getOutputDirectory());
        this.context.setData('screenshotsDirectory', this.executionTracker.getScreenshotsDirectory());
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
      const workflowName = extractWorkflowName(this.workflow, this.workflowFileName);
      this.logger = new Logger();
      this.logger.initialize(workflowName, this.traceLogs);
    }
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

  getExecutedNodeIds(): string[] {
    return Array.from(this.executedNodeIds);
  }

  getCurrentExecutionOrder(): string[] {
    return [...this.currentExecutionOrder];
  }

  isExecutionPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Dynamically enable or disable trace logging
   * @param enabled - Whether trace logging should be enabled
   */
  setTraceLogs(enabled: boolean): void {
    this.traceLogs = enabled;
    
    // Update context so node handlers can access the new state
    this.context.setData('traceLogs', this.traceLogs);
    
    // Initialize logger if trace logs are being enabled and logger doesn't exist
    if (enabled && !this.logger) {
      const workflowName = extractWorkflowName(this.workflow, this.workflowFileName);
      this.logger = new Logger();
      this.logger.initialize(workflowName, this.traceLogs);
      
      // Set logger on PlaywrightManager for browser console log capture
      if (this.playwright) {
        this.playwright.setLogger(this.logger);
      }
    }
    
    // Log the change
    if (enabled) {
      console.log('[TRACE] Trace logging enabled');
    } else {
      console.log('[TRACE] Trace logging disabled');
    }
  }

  async pauseExecution(nodeId: string, reason: 'wait-pause' | 'breakpoint'): Promise<void> {
    if (this.isPaused) {
      return; // Already paused
    }

    this.isPaused = true;
    this.pausedNodeId = nodeId;
    this.pauseReason = reason;

    // If breakpoint pause, set page in session manager for builder mode
    if (reason === 'breakpoint') {
      const page = this.context.getPage();
      const browserContext = this.context.getBrowserContext();
      if (page && browserContext) {
        const sessionManager = ActionRecorderSessionManager.getInstance();
        sessionManager.setIO(this.io);
        sessionManager.setPageFromExecution(page, browserContext, this.executionId);
      }
    }

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
   * Update workflow during breakpoint pause
   * Only allowed when execution is paused due to breakpoint
   */
  updateWorkflow(newWorkflow: Workflow): void {
    // Validate execution is paused
    if (!this.isPaused) {
      throw new Error('Cannot update workflow: execution is not paused');
    }

    // Validate pause reason is breakpoint (not wait-pause)
    if (this.pauseReason !== 'breakpoint') {
      throw new Error('Cannot update workflow: workflow updates are only allowed during breakpoint pauses, not wait-pause');
    }

    // Validate current node still exists in new workflow
    const currentNodeId = this.pausedNodeId || this.currentNodeId;
    if (currentNodeId) {
      const nodeExists = newWorkflow.nodes.some(node => node.id === currentNodeId);
      if (!nodeExists) {
        throw new Error(`Cannot update workflow: current paused node ${currentNodeId} does not exist in new workflow`);
      }
    }

    this.traceLog(`[TRACE] Updating workflow during breakpoint pause`);

    // Migrate workflow
    const migrationResult = migrateWorkflow(newWorkflow);
    if (migrationResult.warnings.length > 0) {
      console.warn('[Migration] Workflow migration warnings:');
      migrationResult.warnings.forEach(warning => {
        console.warn(`[Migration] ${warning}`);
      });
    }

    // Update workflow
    this.workflow = { ...newWorkflow, nodes: migrationResult.nodes };

    // Recreate parser with new workflow
    this.parser = new WorkflowParser(this.workflow);

    // Validate new workflow
    const validation = this.parser.validate();
    if (!validation.valid) {
      const errorMsg = validation.errors.join(', ');
      throw new Error(`Workflow validation failed: ${errorMsg}`);
    }

    // Recompute execution order from current position
    const newExecutionOrder = this.parser.getExecutionOrder(true);
    
    // Find current position in new execution order
    let newIndex = 0;
    if (currentNodeId) {
      const currentIndex = newExecutionOrder.indexOf(currentNodeId);
      if (currentIndex !== -1) {
        // If current node exists in new order, start from it (or next if it was already executed)
        newIndex = this.executedNodeIds.has(currentNodeId) ? currentIndex + 1 : currentIndex;
      } else {
        // Current node not found - this shouldn't happen due to validation above, but handle gracefully
        // Find the first unexecuted node
        for (let i = 0; i < newExecutionOrder.length; i++) {
          if (!this.executedNodeIds.has(newExecutionOrder[i])) {
            newIndex = i;
            break;
          }
        }
      }
    }

    // Filter out already executed nodes from the new execution order
    const remainingExecutionOrder = newExecutionOrder.filter(nodeId => !this.executedNodeIds.has(nodeId));
    
    // Validate that we have nodes to execute
    if (remainingExecutionOrder.length === 0 && this.executedNodeIds.size < newExecutionOrder.length) {
      // This means all remaining nodes were deleted - execution should complete
      this.traceLog(`[TRACE] All remaining nodes were deleted in workflow update - execution will complete`);
    }
    
    // Update execution order
    this.currentExecutionOrder = remainingExecutionOrder;
    
    // Set execution index to the current paused node's position in the filtered order
    // Since the loop increments index BEFORE executing, we set it to the paused node's position
    // so it will execute the paused node when execution continues
    let newExecutionIndex = 0;
    if (currentNodeId) {
      const indexInFilteredOrder = remainingExecutionOrder.indexOf(currentNodeId);
      if (indexInFilteredOrder !== -1) {
        // Current node is in filtered order - set index to its position
        // The loop will increment before executing, so we need to set it to index-1
        // But actually, the increment happens before execution, so if we want to execute
        // the node at index N, we should set executionOrderIndex to N (it will increment to N+1, then execute N)
        // Wait, that's wrong. Let me check the loop logic again...
        // Loop: get nodeId = currentExecutionOrder[executionOrderIndex], then increment, then execute
        // So if executionOrderIndex = 0, it gets node[0], increments to 1, executes node[0]
        // If we want to execute node at index 0, we set executionOrderIndex to 0
        // But if execution is paused AT node 0, and we've already incremented, then executionOrderIndex might be 1
        // Actually, when paused, executionOrderIndex points to the NEXT node to execute
        // So if we're paused at node 0, executionOrderIndex should be 0 (will execute node 0)
        // If node 0 is already executed and filtered out, remainingExecutionOrder[0] is node 1
        // So we need to find where currentNodeId is in remainingExecutionOrder
        newExecutionIndex = indexInFilteredOrder;
      } else if (this.executedNodeIds.has(currentNodeId)) {
        // Current node is already executed - start from beginning of filtered order
        newExecutionIndex = 0;
      } else {
        // Current node not in filtered order and not executed - shouldn't happen, but start from beginning
        newExecutionIndex = 0;
      }
    }
    this.executionOrderIndex = newExecutionIndex;
    
    // If execution order is empty, we've completed all remaining work
    if (remainingExecutionOrder.length === 0) {
      this.traceLog(`[TRACE] No remaining nodes to execute after workflow update`);
    }

    this.traceLog(`[TRACE] Updated execution order: ${remainingExecutionOrder.join(' -> ')}`);
    this.traceLog(`[TRACE] Executed nodes: ${Array.from(this.executedNodeIds).join(', ')}`);

    // Update context with new workflow
    this.context.setData('fullWorkflow', this.workflow);
    this.context.setData('reusableScopes', this.parser.getReusableScopes());
    this.context.setData('resolvePropertyInputs', (node: BaseNode) => this.resolvePropertyInputs(node));
    
    // Store workflow in context for node handlers (needed for RunReusableHandler)
    (this.context as any).workflow = this.workflow;

    // Update breakpoint config if nodes have changed
    // Re-check breakpoint settings from new workflow nodes
    if (this.breakpointConfig && this.breakpointConfig.breakpointFor === 'marked') {
      // Breakpoint config remains the same, but nodes may have changed
      // The shouldTriggerBreakpoint method will check node.data.breakpoint
    }
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
      // Bind explicitly to ensure 'this' context is preserved
      this.context.setData('resolvePropertyInputs', this.resolvePropertyInputs.bind(this));
      // Store trace logging function for RunReusableHandler to use
      // Bind explicitly to ensure 'this' context is preserved
      this.context.setData('traceLog', this.traceLog.bind(this));
      // Bind explicitly to ensure 'this' context is preserved
      this.context.setData('emitEvent', this.emitEvent.bind(this));
      this.context.setData('setCurrentNodeId', (nodeId: string | null) => { this.currentNodeId = nodeId; });
      this.context.setData('getCurrentNodeId', () => this.currentNodeId);
      this.context.setData('pauseExecution', this.pauseExecution.bind(this));
      this.context.setData('traceLogs', this.traceLogs);

      this.status = ExecutionStatus.RUNNING;
      const workflowName = extractWorkflowName(this.workflow, this.workflowFileName);
      this.traceLog(`[TRACE] Execution started - ${workflowName}`);
      this.emitEvent({
        type: ExecutionEventType.EXECUTION_START,
        timestamp: Date.now(),
      });

      // Get execution order (excludes nodes in reusable scopes)
      const executionOrder = this.parser.getExecutionOrder(true);
      this.currentExecutionOrder = [...executionOrder];
      this.executionOrderIndex = 0;
      this.executedNodeIds.clear();
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

        // Execute nodes in order (use dynamic execution order that can be updated)
        while (this.executionOrderIndex < this.currentExecutionOrder.length) {
          // Check if execution order was updated (workflow modified during breakpoint)
          // If so, we may need to recompute - but this is handled by updateWorkflow
          const nodeId = this.currentExecutionOrder[this.executionOrderIndex];
          
          // Safety check: ensure node still exists
          if (!nodeId) {
            this.traceLog(`[TRACE] Warning: Empty nodeId in execution order at index ${this.executionOrderIndex}`);
            this.executionOrderIndex++;
            continue;
          }
          
          // Safety check: skip if node is already executed (shouldn't happen if filtering works correctly)
          if (this.executedNodeIds.has(nodeId)) {
            this.traceLog(`[TRACE] Skipping already executed node: ${nodeId}`);
            this.executionOrderIndex++;
            continue;
          }
          
          this.executionOrderIndex++;
        if (this.stopRequested) {
          this.status = ExecutionStatus.STOPPED;
          const workflowName = extractWorkflowName(this.workflow, this.workflowFileName);
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
          
          // Mark as executed (skipped nodes are considered executed)
          this.executedNodeIds.add(nodeId);
          
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
          
          // Mark as executed (skipped nodes are considered executed)
          this.executedNodeIds.add(nodeId);
          
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
          
          // Mark as executed (skipped nodes are considered executed)
          this.executedNodeIds.add(nodeId);
          
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
          
          // Mark as executed (bypassed nodes are considered executed)
          this.executedNodeIds.add(nodeId);
          
          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            message: 'Node bypassed',
            timestamp: Date.now(),
          });
          continue;
        }

        // Check for pre-execution breakpoint
        if (shouldTriggerBreakpoint(node, 'pre', this.breakpointConfig)) {
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
            // Mark as executed even though we're skipping
            this.executedNodeIds.add(nodeId);
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
          await takeNodeScreenshot(nodeId, 'pre', this.context, this.playwright, this.executionTracker);
        }

        try {
          // Resolve property input connections before execution
          const resolvedNode = resolvePropertyInputs(node, this.workflow, this.parser, this.context, (message: string) => this.traceLog(message));
          
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
          if (this.slowMo > 0 && nodeId !== this.currentExecutionOrder[this.currentExecutionOrder.length - 1]) {
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

          // Check if this is a loop node and handle iteration
          if (resolvedNode.type === NodeType.LOOP) {
            const loopMode = this.context.getData('_loopMode') as 'forEach' | 'doWhile' | undefined;
            
            if (!loopMode) {
              throw new Error('Loop mode not set. Loop handler must execute before executor iteration.');
            }

            // Get all child nodes of the loop node (nodes reachable from its output)
            const childNodeIds = this.parser.getNodesReachableFromHandle(nodeId, 'output');
            
            if (childNodeIds.length === 0) {
              this.traceLog(`[TRACE] Loop node ${nodeId} has no child nodes to iterate`);
            } else if (loopMode === 'forEach') {
              // Mode A: For Each (Array Iterator)
              const loopArray = this.context.getData('_loopArray') as any[] | undefined;
              
              if (!loopArray || !Array.isArray(loopArray)) {
                throw new Error('Loop array not found or is not an array');
              }

              this.traceLog(`[TRACE] Loop node ${nodeId} (forEach) iterating over ${loopArray.length} items`);
              
              // Iterate through array elements
              for (let i = 0; i < loopArray.length; i++) {
                const currentItem = loopArray[i];
                
                // Update loop context variables
                this.context.setVariable('index', i);
                this.context.setVariable('item', currentItem);
                this.traceLog(`[TRACE] Loop iteration ${i + 1}/${loopArray.length}: processing item ${JSON.stringify(currentItem)}`);
                
                // Execute each child node for this iteration
                for (const childNodeId of childNodeIds) {
                  // Skip if marked as skipped
                  if (skippedNodes.has(childNodeId)) {
                    continue;
                  }
                  
                  // Get the child node
                  const childNode = this.parser.getNode(childNodeId);
                  if (!childNode) {
                    continue;
                  }
                  
                  // Resolve property inputs
                  const resolvedChildNode = resolvePropertyInputs(childNode, this.workflow, this.parser, this.context, (message: string) => this.traceLog(message));
                  
                  // Get handler
                  const childHandler = nodeHandlers.getNodeHandler(resolvedChildNode.type);
                  if (!childHandler) {
                    this.traceLog(`[TRACE] Warning: No handler found for child node type: ${resolvedChildNode.type}`);
                    continue;
                  }
                  
                  // Execute child node
                  this.traceLog(`[TRACE] Executing loop child node: ${childNodeId} (type: ${resolvedChildNode.type})`);
                  await childHandler.execute(resolvedChildNode, this.context);
                  this.traceLog(`[TRACE] Loop child node ${childNodeId} completed successfully`);
                  
                  // Apply slowmo delay if enabled
                  if (this.slowMo > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.slowMo));
                  }
                }
              }
              
              // Mark loop child nodes as executed so they don't execute again after the loop
              for (const childNodeId of childNodeIds) {
                this.executedNodeIds.add(childNodeId);
              }
              
              this.traceLog(`[TRACE] Loop node ${nodeId} (forEach) completed all iterations`);
            } else if (loopMode === 'doWhile') {
              // Mode B: Do While (Condition Based)
              const condition = this.context.getData('_loopCondition');
              const maxIterations = this.context.getData('_loopMaxIterations') as number || 1000;
              const updateStep = this.context.getData('_loopUpdateStep') as string | null;
              const shouldStart = this.context.getData('_loopShouldStart') as boolean;
              
              if (!condition) {
                throw new Error('Loop condition not found');
              }

              // Check if loop should start (initial condition evaluation)
              if (!shouldStart) {
                this.traceLog(`[TRACE] Loop node ${nodeId} (doWhile) initial condition failed, skipping loop`);
                // Mark child nodes as executed since loop won't run
                for (const childNodeId of childNodeIds) {
                  this.executedNodeIds.add(childNodeId);
                }
              } else {
                this.traceLog(`[TRACE] Loop node ${nodeId} (doWhile) starting iteration`);
                
                let iterationCount = 0;
                let conditionPassed = true;
                
                // Continue while condition is true and maxIterations not exceeded
                while (conditionPassed && iterationCount < maxIterations) {
                  // Check maxIterations limit
                  if (iterationCount >= maxIterations) {
                    throw new Error(`Loop exceeded maximum iterations limit of ${maxIterations}`);
                  }
                  
                  // Update loop context variables
                  this.context.setVariable('index', iterationCount);
                  this.traceLog(`[TRACE] Loop iteration ${iterationCount + 1}: condition passed`);
                  
                  // Execute each child node for this iteration
                  for (const childNodeId of childNodeIds) {
                    // Skip if marked as skipped
                    if (skippedNodes.has(childNodeId)) {
                      continue;
                    }
                    
                    // Get the child node
                    const childNode = this.parser.getNode(childNodeId);
                    if (!childNode) {
                      continue;
                    }
                    
                    // Resolve property inputs
                    const resolvedChildNode = resolvePropertyInputs(childNode, this.workflow, this.parser, this.context, (message: string) => this.traceLog(message));
                    
                    // Get handler
                    const childHandler = nodeHandlers.getNodeHandler(resolvedChildNode.type);
                    if (!childHandler) {
                      this.traceLog(`[TRACE] Warning: No handler found for child node type: ${resolvedChildNode.type}`);
                      continue;
                    }
                    
                    // Execute child node
                    this.traceLog(`[TRACE] Executing loop child node: ${childNodeId} (type: ${resolvedChildNode.type})`);
                    await childHandler.execute(resolvedChildNode, this.context);
                    this.traceLog(`[TRACE] Loop child node ${childNodeId} completed successfully`);
                    
                    // Apply slowmo delay if enabled
                    if (this.slowMo > 0) {
                      await new Promise(resolve => setTimeout(resolve, this.slowMo));
                    }
                  }
                  
                  // Execute updateStep JavaScript code if provided
                  if (updateStep) {
                    try {
                      const contextData = {
                        page: this.context.getPage(),
                        data: this.context.getAllData(),
                        variables: this.context.getAllVariables(),
                        setData: (key: string, value: any) => this.context.setData(key, value),
                        setVariable: (key: string, value: any) => this.context.setVariable(key, value),
                        getData: (key: string) => this.context.getData(key),
                        getVariable: (key: string) => this.context.getVariable(key),
                      };
                      
                      // eslint-disable-next-line @typescript-eslint/no-implied-eval
                      const fn = new Function('context', `return (async function(context) { ${updateStep} })(context);`);
                      await fn(contextData);
                      this.traceLog(`[TRACE] Loop updateStep executed successfully`);
                    } catch (error: any) {
                      this.traceLog(`[TRACE] Warning: Loop updateStep failed: ${error.message}`);
                      // Continue execution even if updateStep fails
                    }
                  }
                  
                  // Increment iteration count
                  iterationCount++;
                  
                  // Re-evaluate condition for next iteration
                  try {
                    const conditionResult = await ConditionEvaluator.evaluate(condition, this.context);
                    conditionPassed = conditionResult.passed;
                    if (!conditionPassed) {
                      this.traceLog(`[TRACE] Loop condition failed after ${iterationCount} iterations, exiting loop`);
                    }
                  } catch (error: any) {
                    this.traceLog(`[TRACE] Error evaluating loop condition: ${error.message}`);
                    conditionPassed = false; // Exit loop on condition evaluation error
                  }
                }
                
                // Check if loop exited due to maxIterations
                if (iterationCount >= maxIterations && conditionPassed) {
                  throw new Error(`Loop exceeded maximum iterations limit of ${maxIterations}`);
                }
                
                // Mark loop child nodes as executed so they don't execute again after the loop
                for (const childNodeId of childNodeIds) {
                  this.executedNodeIds.add(childNodeId);
                }
                
                this.traceLog(`[TRACE] Loop node ${nodeId} (doWhile) completed after ${iterationCount} iterations`);
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
            await takeNodeScreenshot(nodeId, 'post', this.context, this.playwright, this.executionTracker);
          }

          // Record node completion in tracker
          if (this.executionTracker) {
            this.executionTracker.recordNodeComplete(nodeId);
          }

          // Mark node as executed
          this.executedNodeIds.add(nodeId);

          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            timestamp: Date.now(),
          });

          // Check for post-execution breakpoint
          if (shouldTriggerBreakpoint(node, 'post', this.breakpointConfig)) {
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
          
          // Take failure screenshot if browser is open (before context closes)
          if (this.executionTracker) {
            try {
              const page = this.context.getPage();
              if (page && (!page.isClosed || !page.isClosed())) {
                await takeNodeScreenshot(
                  nodeId,
                  'failure',
                  this.context,
                  this.playwright,
                  this.executionTracker
                );
              }
            } catch (screenshotError: any) {
              // Don't fail execution if screenshot fails
              console.warn(`Failed to take failure screenshot for node ${nodeId}: ${screenshotError.message}`);
            }
          }
          
          // Capture debug info for UI nodes
          let debugInfo;
          if (isUINode(node)) {
            try {
              const page = this.context.getPage();
              if (page && (!page.isClosed || !page.isClosed())) {
                const selectorInfo = extractSelectorInfo(node);
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
          
          // Record node error in tracker with trace logs and debug info
          if (this.executionTracker) {
            this.executionTracker.recordNodeError(nodeId, error.message, traceLogs, debugInfo);
          }
          
          // If failSilently is enabled, continue execution instead of throwing
          if (failSilently) {
            this.traceLog(`[TRACE] Node ${nodeId} failed silently, continuing execution`);
            // Mark as executed even though it failed (failSilently means we continue)
            this.executedNodeIds.add(nodeId);
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
        const lastNodeId = this.currentExecutionOrder[this.currentExecutionOrder.length - 1];
        
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
      await recordVideos(this.playwright, this.context, this.executionTracker, this.workflow, (message: string) => this.traceLog(message));
      
      // Complete execution in tracker
      if (this.executionTracker) {
        this.executionTracker.completeExecution('completed');
      }
      
      // Generate reports if enabled
      if (this.reportConfig?.enabled && this.executionTracker) {
        await generateReports(this.executionTracker, this.reportConfig, (message: string) => this.traceLog(message));
      }
      
      this.emitEvent({
        type: ExecutionEventType.EXECUTION_COMPLETE,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      this.status = ExecutionStatus.ERROR;
      this.error = error.message;
      const workflowName = extractWorkflowName(this.workflow, this.workflowFileName);
      this.traceLog(`[TRACE] Execution failed - ${workflowName}: ${error.message}`);
      
      // Record videos before generating reports (videos are finalized when browser closes)
      await recordVideos(this.playwright, this.context, this.executionTracker, this.workflow, (message: string) => this.traceLog(message));
      
      // Complete execution with error status in tracker
      if (this.executionTracker) {
        this.executionTracker.completeExecution('error');
      }
      
      // Generate reports even on error if enabled
      if (this.reportConfig?.enabled && this.executionTracker) {
        await generateReports(this.executionTracker, this.reportConfig, this.traceLog);
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
    // Use a local reference to avoid 'this' binding issues
    const traceLogsEnabled = this.traceLogs;
    const currentNodeId = this.currentNodeId;
    const nodeTraceLogs = this.nodeTraceLogs;
    const logger = this.logger;
    
    if (traceLogsEnabled) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}`;
      console.log(logMessage);
      
      // Write to logger file (async, non-blocking)
      logger?.writeTerminalLog(logMessage);
      
      // Store trace log for current node if executing
      if (currentNodeId) {
        const logs = nodeTraceLogs.get(currentNodeId) || [];
        logs.push(logMessage);
        nodeTraceLogs.set(currentNodeId, logs);
      }
    }
  }

  // Helper methods that delegate to utility functions
  private resolvePropertyInputs(node: BaseNode): BaseNode {
    return resolvePropertyInputs(node, this.workflow, this.parser, this.context, (message: string) => this.traceLog(message));
  }
}
