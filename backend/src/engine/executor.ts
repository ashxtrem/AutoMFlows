import { Workflow, ExecutionStatus, ExecutionEventType, ExecutionEvent, BaseNode, Edge, NodeType, PropertyDataType } from '@automflows/shared';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowParser } from './parser';
import { ContextManager } from './context';
import { PlaywrightManager } from '../utils/playwright';
import * as nodeHandlers from '../nodes';
import { TypeConverter } from '../utils/typeConverter';

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
        // Clear trace logs for this node at start
        this.nodeTraceLogs.set(nodeId, []);
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

          // Clear trace logs on success (we only need them for errors)
          this.nodeTraceLogs.delete(nodeId);

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
          
          this.emitEvent({
            type: ExecutionEventType.NODE_ERROR,
            nodeId,
            message: error.message,
            traceLogs: traceLogs,
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

