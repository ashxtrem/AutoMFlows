import { Workflow, ExecutionStatus, ExecutionEventType, ExecutionEvent, BaseNode, Edge, NodeType, PropertyDataType, ScreenshotConfig, ReportConfig } from '@automflows/shared';
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
import { getAllReusableScopes } from '../utils/reusableFlowExtractor';
import * as path from 'path';

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

  constructor(
    workflow: Workflow, 
    io: Server, 
    traceLogs: boolean = false,
    screenshotConfig?: ScreenshotConfig,
    reportConfig?: ReportConfig
  ) {
    this.executionId = uuidv4();
    this.workflow = workflow;
    this.io = io;
    this.traceLogs = traceLogs;
    this.screenshotConfig = screenshotConfig;
    this.reportConfig = reportConfig;
    this.parser = new WorkflowParser(workflow);
    this.context = new ContextManager();
    
    // Initialize execution tracker if screenshots or reporting is enabled
    const shouldCreateTracker = (screenshotConfig?.enabled) || (reportConfig?.enabled);
    if (shouldCreateTracker) {
      // Use report config output path if available, otherwise default to './output'
      // Path will be resolved relative to project root in ExecutionTracker
      const outputPath = reportConfig?.outputPath || './output';
      this.executionTracker = new ExecutionTracker(this.executionId, workflow, outputPath);
      
      // Store directory paths in context for node handlers
      this.context.setData('outputDirectory', this.executionTracker.getOutputDirectory());
      this.context.setData('screenshotsDirectory', this.executionTracker.getScreenshotsDirectory());
      
      // Initialize PlaywrightManager with screenshots directory
      this.playwright = new PlaywrightManager(this.executionTracker.getScreenshotsDirectory());
    } else {
      this.playwright = new PlaywrightManager();
    }
    
    // Store playwright in context for node handlers
    (this.context as any).playwright = this.playwright;
    
    // Store workflow in context for node handlers (needed for RunReusableHandler)
    (this.context as any).workflow = this.workflow;
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

      this.status = ExecutionStatus.RUNNING;
      this.traceLog(`[TRACE] Execution started - ID: ${this.executionId}`);
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
          this.traceLog(`[TRACE] Execution stopped by user`);
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

      this.status = ExecutionStatus.COMPLETED;
      this.currentNodeId = null;
      this.traceLog(`[TRACE] Execution completed successfully`);
      
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
      this.traceLog(`[TRACE] Execution failed: ${error.message}`);
      
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
    } catch (error: any) {
      console.error(`Failed to generate reports: ${error.message}`);
      // Don't fail execution if report generation fails
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await this.playwright.close();
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
    if (nodeType === NodeType.CLICK || 
        nodeType === NodeType.TYPE || 
        nodeType === NodeType.GET_TEXT || 
        nodeType === NodeType.SCREENSHOT) {
      return true;
    }

    // Navigate node with waitForSelector
    if (nodeType === NodeType.NAVIGATE && nodeData?.waitForSelector) {
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
    if (nodeType === NodeType.CLICK || 
        nodeType === NodeType.TYPE || 
        nodeType === NodeType.GET_TEXT) {
      return {
        selector: nodeData?.selector,
        selectorType: nodeData?.selectorType || 'css',
      };
    }

    // Navigate node with waitForSelector
    if (nodeType === NodeType.NAVIGATE && nodeData?.waitForSelector) {
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

