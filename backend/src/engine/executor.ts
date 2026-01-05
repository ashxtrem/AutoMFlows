import { Workflow, ExecutionStatus, ExecutionEventType, ExecutionEvent } from '@automflows/shared';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowParser } from './parser';
import { ContextManager } from './context';
import { PlaywrightManager } from '../utils/playwright';
import * as nodeHandlers from '../nodes';

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

  constructor(workflow: Workflow, io: Server, traceLogs: boolean = false) {
    this.executionId = uuidv4();
    this.workflow = workflow;
    this.io = io;
    this.traceLogs = traceLogs;
    this.parser = new WorkflowParser(workflow);
    this.context = new ContextManager();
    this.playwright = new PlaywrightManager();
    // Store playwright in context for node handlers
    (this.context as any).playwright = this.playwright;
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
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      this.status = ExecutionStatus.RUNNING;
      this.traceLog(`[TRACE] Execution started - ID: ${this.executionId}`);
      this.emitEvent({
        type: ExecutionEventType.EXECUTION_START,
        timestamp: Date.now(),
      });

      // Get execution order
      const executionOrder = this.parser.getExecutionOrder();
      this.traceLog(`[TRACE] Execution order: ${executionOrder.join(' -> ')}`);

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

        // Check if node is bypassed
        const nodeData = node.data as any;
        if (nodeData?.bypass === true) {
          this.traceLog(`[TRACE] Skipping bypassed node: ${nodeId} (type: ${node.type})`);
          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            message: 'Node bypassed',
            timestamp: Date.now(),
          });
          continue;
        }

        this.currentNodeId = nodeId;
        this.traceLog(`[TRACE] Starting node: ${nodeId} (type: ${node.type})`);
        if (this.traceLogs && node.data) {
          this.traceLog(`[TRACE] Node config: ${JSON.stringify(node.data, null, 2)}`);
        }
        this.emitEvent({
          type: ExecutionEventType.NODE_START,
          nodeId,
          timestamp: Date.now(),
        });

        try {
          // Get handler for node type
          const handler = nodeHandlers.getNodeHandler(node.type);
          if (!handler) {
            throw new Error(`No handler found for node type: ${node.type}`);
          }

          // Execute node
          this.traceLog(`[TRACE] Executing node handler for: ${node.type}`);
          await handler.execute(node, this.context);
          this.traceLog(`[TRACE] Node ${nodeId} completed successfully`);

          this.emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            timestamp: Date.now(),
          });
        } catch (error: any) {
          this.error = error.message;
          this.traceLog(`[TRACE] Node ${nodeId} failed: ${error.message}`);
          this.emitEvent({
            type: ExecutionEventType.NODE_ERROR,
            nodeId,
            message: error.message,
            timestamp: Date.now(),
          });
          throw error;
        }
      }

      this.status = ExecutionStatus.COMPLETED;
      this.currentNodeId = null;
      this.traceLog(`[TRACE] Execution completed successfully`);
      this.emitEvent({
        type: ExecutionEventType.EXECUTION_COMPLETE,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      this.status = ExecutionStatus.ERROR;
      this.error = error.message;
      this.traceLog(`[TRACE] Execution failed: ${error.message}`);
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
      console.log(`[${timestamp}] ${message}`);
    }
  }
}

