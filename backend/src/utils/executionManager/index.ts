import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { Executor } from '../../engine/executor/core';
import { PlaywrightManager } from '../playwright';
import { 
  Workflow, 
  ExecutionStatus, 
  ScreenshotConfig, 
  ReportConfig,
  BatchPersistenceMetadata,
  ExecutionPersistenceMetadata,
  StartNodeOverrides
} from '@automflows/shared';
import { getBatchPersistence } from '../batchPersistence';

/**
 * Execution metadata stored in registry
 */
interface ExecutionMetadata {
  executionId: string;
  batchId?: string;
  workflow: Workflow;
  workflowFileName?: string;
  workflowPath?: string;
  executor: Executor;
  status: ExecutionStatus;
  workerId?: number;
  startTime: number;
  endTime?: number;
  error?: string;
  cancelled?: boolean; // For queued executions that were cancelled
}

/**
 * Batch metadata
 */
interface BatchMetadata {
  batchId: string;
  status?: 'running' | 'completed' | 'error' | 'stopped'; // Batch status
  sourceType: 'folder' | 'files' | 'workflows';
  folderPath?: string;
  totalWorkflows: number;
  validWorkflows: number;
  invalidWorkflows: number;
  completed: number;
  running: number;
  queued: number;
  failed: number;
  workers: number;
  priority: number;
  startTime: number;
  endTime?: number;
  outputPath: string;
  startNodeOverrides?: StartNodeOverrides;
  executionIds: string[]; // Track all execution IDs in this batch
}

/**
 * Queue item for worker pool
 */
interface QueueItem {
  executionId: string;
  batchId: string;
  priority: number;
  enqueuedAt: number;
}

/**
 * ExecutionManager - Manages multiple concurrent workflow executions
 * Supports both single and parallel execution modes
 */
export class ExecutionManager {
  private executions: Map<string, ExecutionMetadata> = new Map();
  private batches: Map<string, BatchMetadata> = new Map();
  private queue: QueueItem[] = [];
  private maxWorkers: number;
  private activeWorkers: number = 0;
  private batchActiveWorkers: Map<string, number> = new Map(); // Track active workers per batch
  private io: Server;
  private persistence = getBatchPersistence();
  private nextWorkerId: number = 1;

  constructor(io: Server, maxWorkers: number = 4) {
    this.io = io;
    this.maxWorkers = maxWorkers;
  }

  /**
   * Start single workflow execution
   */
  async startSingleExecution(
    workflow: Workflow,
    options: {
      traceLogs?: boolean;
      screenshotConfig?: ScreenshotConfig;
      reportConfig?: ReportConfig;
      recordSession?: boolean;
      breakpointConfig?: any;
      builderModeEnabled?: boolean;
      workflowFileName?: string;
    } = {}
  ): Promise<string> {
    // Create isolated PlaywrightManager for this execution
    const playwrightManager = new PlaywrightManager();
    
    // Create executor with isolated PlaywrightManager
    const executor = new Executor(
      workflow,
      this.io,
      options.traceLogs || false,
      options.screenshotConfig,
      options.reportConfig,
      options.recordSession || false,
      options.breakpointConfig,
      options.builderModeEnabled || false,
      options.workflowFileName,
      playwrightManager // Pass isolated PlaywrightManager
    );

    const executionId = executor.getExecutionId();

    // Set execution context flags
    executor['context'].setData('isParallelExecution', false);
    executor['context'].setData('executionId', executionId);

    // Store execution metadata
    const metadata: ExecutionMetadata = {
      executionId,
      workflow,
      workflowFileName: options.workflowFileName,
      executor,
      status: ExecutionStatus.IDLE,
      startTime: Date.now(),
    };

    this.executions.set(executionId, metadata);

    // Start execution asynchronously
    executor.execute().catch((error) => {
      console.error(`[ExecutionManager] Execution ${executionId} error:`, error);
      this.handleExecutionError(executionId, error);
    });

    return executionId;
  }

  /**
   * Start parallel execution (batch)
   */
  async startBatchExecution(
    workflows: Array<{ workflow: Workflow; fileName?: string; filePath?: string }>,
    options: {
      sourceType: 'folder' | 'files' | 'workflows';
      folderPath?: string;
      workers?: number;
      traceLogs?: boolean;
      screenshotConfig?: ScreenshotConfig;
      reportConfig?: ReportConfig;
      recordSession?: boolean;
      outputPath?: string;
      startNodeOverrides?: StartNodeOverrides;
      priority?: number;
    }
  ): Promise<string> {
    const batchId = uuidv4();
    const workers = options.workers || this.maxWorkers;
    const validWorkflows = workflows.filter(w => w.workflow);
    const invalidWorkflows = workflows.length - validWorkflows.length;

    // Create batch metadata
    const batch: BatchMetadata = {
      batchId,
      sourceType: options.sourceType,
      folderPath: options.folderPath,
      totalWorkflows: workflows.length,
      validWorkflows: validWorkflows.length,
      invalidWorkflows,
      completed: 0,
      running: 0,
      queued: validWorkflows.length, // Track queued count separately
      failed: 0,
      workers,
      priority: options.priority || 0,
      startTime: Date.now(),
      outputPath: options.outputPath || './output',
      startNodeOverrides: options.startNodeOverrides,
      executionIds: [],
    };

    this.batches.set(batchId, batch);

    // Persist batch to database
    this.saveBatchToPersistence(batch);

    // Create executions for each valid workflow
    for (const { workflow, fileName, filePath } of validWorkflows) {
      const executionId = await this.createExecutionForBatch(
        batchId,
        workflow,
        {
          workflowFileName: fileName,
          workflowPath: filePath,
          traceLogs: options.traceLogs,
          screenshotConfig: options.screenshotConfig,
          reportConfig: options.reportConfig,
          recordSession: options.recordSession,
          outputPath: options.outputPath,
          startNodeOverrides: options.startNodeOverrides,
        }
      );
      batch.executionIds.push(executionId);
    }

    // Emit batch start event
    this.io.emit('batch-start', {
      batchId,
      totalWorkflows: batch.totalWorkflows,
      timestamp: Date.now(),
    });

    // Start processing queue
    this.processQueue();

    return batchId;
  }

  /**
   * Create execution for batch
   */
  private async createExecutionForBatch(
    batchId: string,
    workflow: Workflow,
    options: {
      workflowFileName?: string;
      workflowPath?: string;
      traceLogs?: boolean;
      screenshotConfig?: ScreenshotConfig;
      reportConfig?: ReportConfig;
      recordSession?: boolean;
      outputPath?: string;
      startNodeOverrides?: StartNodeOverrides;
    }
  ): Promise<string> {
    // Create isolated PlaywrightManager for this execution
    const playwrightManager = new PlaywrightManager();

    // Create executor with isolated PlaywrightManager
    const executor = new Executor(
      workflow,
      this.io,
      options.traceLogs || false,
      options.screenshotConfig,
      options.reportConfig,
      options.recordSession || false,
      undefined, // No breakpointConfig in parallel mode
      false, // No builderModeEnabled in parallel mode
      options.workflowFileName,
      playwrightManager // Pass isolated PlaywrightManager
    );

    const executionId = executor.getExecutionId();

    // Set execution context flags for parallel mode
    executor['context'].setData('isParallelExecution', true);
    executor['context'].setData('executionId', executionId);
    executor['context'].setData('batchId', batchId);

    // Store execution metadata
    const metadata: ExecutionMetadata = {
      executionId,
      batchId,
      workflow,
      workflowFileName: options.workflowFileName,
      workflowPath: options.workflowPath,
      executor,
      status: ExecutionStatus.IDLE, // IDLE means queued
      startTime: Date.now(),
      cancelled: false,
    };

    this.executions.set(executionId, metadata);

    // Get batch to update counts
    const batch = this.batches.get(batchId);
    if (batch) {
      batch.queued = (batch.queued || 0) + 1;
    }

    // Persist execution to database
    this.saveExecutionToPersistence({
      executionId,
      batchId,
      workflowFileName: options.workflowFileName || 'workflow.json',
      workflowPath: options.workflowPath,
      status: 'queued',
      startTime: Date.now(),
    });

    // Enqueue execution
    this.enqueueExecution(batchId, executionId, batch?.priority || 0);

    return executionId;
  }

  /**
   * Enqueue execution for worker assignment
   */
  private enqueueExecution(batchId: string, executionId: string, priority: number): void {
    this.queue.push({
      executionId,
      batchId,
      priority,
      enqueuedAt: Date.now(),
    });

    // Sort queue by priority (higher first), then by enqueuedAt (FIFO)
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  /**
   * Process queue and assign workers
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
      // Find next item that can be processed (respects batch worker limits)
      let itemIndex = -1;
      for (let i = 0; i < this.queue.length; i++) {
        const item = this.queue[i];
        const batch = this.batches.get(item.batchId);
        if (!batch) continue;

        // Check if batch has reached its worker limit
        const batchActiveCount = this.batchActiveWorkers.get(item.batchId) || 0;
        const batchWorkerLimit = batch.workers || this.maxWorkers;
        
        // Check global worker limit and batch-specific worker limit
        if (this.activeWorkers < this.maxWorkers && batchActiveCount < batchWorkerLimit) {
          itemIndex = i;
          break;
        }
      }

      // No item can be processed (all batches at their limits or global limit reached)
      if (itemIndex === -1) break;

      const item = this.queue.splice(itemIndex, 1)[0];
      if (!item) break;

      const execution = this.executions.get(item.executionId);
      if (!execution) continue;

      // Check if execution was cancelled
      if (execution.cancelled) {
        execution.status = ExecutionStatus.STOPPED;
        this.handleExecutionComplete(item.executionId, ExecutionStatus.STOPPED);
        continue;
      }

      // Assign worker
      const workerId = this.nextWorkerId++;
      execution.workerId = workerId;
      execution.status = ExecutionStatus.RUNNING;
      this.activeWorkers++;
      
      // Increment batch active workers count
      const batchActiveCount = this.batchActiveWorkers.get(item.batchId) || 0;
      this.batchActiveWorkers.set(item.batchId, batchActiveCount + 1);

      // Update batch counts
      const batch = this.batches.get(item.batchId);
      if (batch) {
        batch.running = (batch.running || 0) + 1;
        batch.queued = Math.max(0, (batch.queued || 0) - 1);
        this.updateBatchProgress(item.batchId);
      }

      // Update execution in persistence
      this.updateExecutionInPersistence(item.executionId, {
        status: 'running',
        workerId,
      });

      // Start execution asynchronously
      execution.executor.execute()
        .then(() => {
          this.handleExecutionComplete(item.executionId, ExecutionStatus.COMPLETED);
        })
        .catch((error) => {
          console.error(`[ExecutionManager] Execution ${item.executionId} error:`, error);
          this.handleExecutionError(item.executionId, error);
        })
        .finally(() => {
          this.activeWorkers--;
          
          // Decrement batch active workers count
          const currentBatchActive = this.batchActiveWorkers.get(item.batchId) || 0;
          if (currentBatchActive > 0) {
            this.batchActiveWorkers.set(item.batchId, currentBatchActive - 1);
          }
          
          this.processQueue(); // Process next item in queue
        });
    }
  }

  /**
   * Handle execution completion
   */
  private handleExecutionComplete(executionId: string, status: ExecutionStatus): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = status;
    execution.endTime = Date.now();

    // Update execution in persistence
    this.updateExecutionInPersistence(executionId, {
      status: status === ExecutionStatus.COMPLETED ? 'completed' : 'error',
      endTime: execution.endTime,
    });

    // Update batch counts
    if (execution.batchId) {
      const batch = this.batches.get(execution.batchId);
      if (batch) {
        if (status === ExecutionStatus.COMPLETED) {
          batch.completed = (batch.completed || 0) + 1;
        } else {
          batch.failed = (batch.failed || 0) + 1;
        }
        batch.running = Math.max(0, (batch.running || 0) - 1);
        this.updateBatchProgress(execution.batchId);

        // Check if batch is complete
        if (batch.completed + batch.failed >= batch.validWorkflows) {
          batch.endTime = Date.now();
          batch.status = batch.failed > 0 ? 'error' : 'completed';
          this.completeBatch(execution.batchId);
          
          // Clear batch active workers tracking when batch completes
          this.batchActiveWorkers.delete(execution.batchId);
        }
      }
    }

    // Cleanup executor after a delay (allow time for final events)
    setTimeout(() => {
      this.cleanupExecution(executionId);
    }, 5000);
  }

  /**
   * Handle execution error
   */
  private handleExecutionError(executionId: string, error: Error): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = ExecutionStatus.ERROR;
    execution.error = error.message;
    execution.endTime = Date.now();

    // Update execution in persistence
    this.updateExecutionInPersistence(executionId, {
      status: 'error',
      endTime: execution.endTime,
      error: error.message,
    });

    // Update batch counts
    if (execution.batchId) {
      const batch = this.batches.get(execution.batchId);
      if (batch) {
        batch.failed = (batch.failed || 0) + 1;
        batch.running = Math.max(0, (batch.running || 0) - 1);
        this.updateBatchProgress(execution.batchId);

        // Check if batch is complete
        if (batch.completed + batch.failed >= batch.validWorkflows) {
          batch.endTime = Date.now();
          batch.status = 'error';
          this.completeBatch(execution.batchId);
          
          // Clear batch active workers tracking when batch completes
          this.batchActiveWorkers.delete(execution.batchId);
        }
      }
    }

    // Cleanup executor after a delay
    setTimeout(() => {
      this.cleanupExecution(executionId);
    }, 5000);
  }

  /**
   * Stop execution
   */
  async stopExecution(executionId: string): Promise<{ wasRunning: boolean; wasQueued: boolean }> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const wasRunning = execution.status === ExecutionStatus.RUNNING;
    const wasQueued = execution.status === ExecutionStatus.IDLE;
    const inQueue = this.queue.some((item) => item.executionId === executionId);
    // Single executions start with IDLE and are never queued; executor is running
    const wasSingleRunning = wasQueued && !inQueue;

    if (wasRunning || wasSingleRunning) {
      // Stop running execution (batch RUNNING or single IDLE-not-queued)
      await execution.executor.stop();
      execution.status = ExecutionStatus.STOPPED;
      execution.endTime = Date.now();
      if (wasRunning) {
        this.activeWorkers--;
      }

      // Decrement batch active workers count (batch executions only)
      if (execution.batchId) {
        const currentBatchActive = this.batchActiveWorkers.get(execution.batchId) || 0;
        if (currentBatchActive > 0) {
          this.batchActiveWorkers.set(execution.batchId, currentBatchActive - 1);
        }
        
        const batch = this.batches.get(execution.batchId);
        if (batch) {
          batch.running = Math.max(0, (batch.running || 0) - 1);
          this.updateBatchProgress(execution.batchId);
        }
      }

      // Process queue to assign next execution
      this.processQueue();
    } else if (wasQueued) {
      // Mark queued execution as cancelled
      execution.cancelled = true;
      execution.status = ExecutionStatus.STOPPED;
      
      // Remove from queue
      this.queue = this.queue.filter(item => item.executionId !== executionId);

      // Update batch counts
      if (execution.batchId) {
        const batch = this.batches.get(execution.batchId);
        if (batch) {
          batch.queued = Math.max(0, (batch.queued || 0) - 1);
          this.updateBatchProgress(execution.batchId);
        }
      }
    }

    // Update execution in persistence
    this.updateExecutionInPersistence(executionId, {
      status: 'stopped',
      endTime: Date.now(),
    });

    return { wasRunning, wasQueued };
  }

  /**
   * Stop batch
   */
  async stopBatch(batchId: string): Promise<{ stoppedExecutions: number; runningStopped: number; queuedCancelled: number }> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    let runningStopped = 0;
    let queuedCancelled = 0;

    // Stop all executions in batch
    for (const executionId of batch.executionIds) {
      const execution = this.executions.get(executionId);
      if (!execution) continue;

      if (execution.status === ExecutionStatus.RUNNING) {
        await execution.executor.stop();
        execution.status = ExecutionStatus.STOPPED;
        execution.endTime = Date.now();
        this.activeWorkers--;
        
        // Decrement batch active workers count
        const currentBatchActive = this.batchActiveWorkers.get(batchId) || 0;
        if (currentBatchActive > 0) {
          this.batchActiveWorkers.set(batchId, currentBatchActive - 1);
        }
        
        runningStopped++;
      } else if (execution.status === ExecutionStatus.IDLE) {
        execution.cancelled = true;
        execution.status = ExecutionStatus.STOPPED;
        this.queue = this.queue.filter(item => item.executionId !== executionId);
        queuedCancelled++;
      }
    }
    
    // Clear batch active workers tracking
    this.batchActiveWorkers.delete(batchId);

    // Update batch status
    batch.status = 'stopped';
    batch.endTime = Date.now();
    batch.running = 0;
    batch.queued = 0;
    this.updateBatchProgress(batchId);

    // Persist batch completion
    this.saveBatchToPersistence(batch);

    // Process queue to assign next executions
    this.processQueue();

    return {
      stoppedExecutions: runningStopped + queuedCancelled,
      runningStopped,
      queuedCancelled,
    };
  }

  /**
   * Stop all active executions
   */
  async stopAll(): Promise<{ totalBatches: number; totalStopped: number; runningStopped: number; queuedCancelled: number; batches: Array<{ batchId: string; stopped: number }> }> {
    const activeBatches = Array.from(this.batches.values()).filter(
      b => b.status === 'running' || b.running > 0 || b.queued > 0
    );

    let totalRunningStopped = 0;
    let totalQueuedCancelled = 0;
    const batchResults: Array<{ batchId: string; stopped: number }> = [];

    for (const batch of activeBatches) {
      const result = await this.stopBatch(batch.batchId);
      totalRunningStopped += result.runningStopped;
      totalQueuedCancelled += result.queuedCancelled;
      batchResults.push({
        batchId: batch.batchId,
        stopped: result.stoppedExecutions,
      });
    }

    return {
      totalBatches: activeBatches.length,
      totalStopped: totalRunningStopped + totalQueuedCancelled,
      runningStopped: totalRunningStopped,
      queuedCancelled: totalQueuedCancelled,
      batches: batchResults,
    };
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): {
    executionId: string;
    status: ExecutionStatus;
    currentNodeId?: string;
    error?: string;
    pausedNodeId?: string | null;
    pauseReason?: 'wait-pause' | 'breakpoint' | null;
  } | null {
    const execution = this.executions.get(executionId);
    if (!execution) {
      // Try loading from persistence - need to search all batches
      let persisted: ExecutionPersistenceMetadata | undefined;
      for (const batch of this.batches.values()) {
        const execs = this.persistence.getBatchExecutions(batch.batchId);
        persisted = execs.find(e => e.executionId === executionId);
        if (persisted) break;
      }
      if (persisted) {
        return {
          executionId: persisted.executionId,
          status: persisted.status as ExecutionStatus,
          error: persisted.error || undefined,
        };
      }
      return null;
    }

    return {
      executionId: execution.executionId,
      status: execution.status,
      currentNodeId: execution.executor.getCurrentNodeId() || undefined,
      error: execution.error,
      pausedNodeId: execution.executor.getPausedNodeId(),
      pauseReason: execution.executor.getPauseReason(),
    };
  }

  /**
   * Get batch status
   */
  getBatchStatus(batchId: string): BatchMetadata | null {
    const batch = this.batches.get(batchId);
    if (batch) {
      return { ...batch };
    }

    // Try loading from persistence
    const persisted = this.persistence.getBatch(batchId);
    if (persisted) {
      const executions = this.persistence.getBatchExecutions(batchId);
      return {
        batchId: persisted.batchId,
        sourceType: persisted.sourceType,
        folderPath: persisted.folderPath,
        totalWorkflows: persisted.totalWorkflows,
        validWorkflows: persisted.validWorkflows,
        invalidWorkflows: persisted.invalidWorkflows,
        completed: persisted.completed,
        running: persisted.running,
        queued: persisted.queued,
        failed: persisted.failed,
        workers: persisted.workers,
        priority: persisted.priority,
        startTime: persisted.startTime,
        endTime: persisted.endTime,
        outputPath: persisted.outputPath,
        startNodeOverrides: persisted.startNodeOverrides,
        executionIds: executions.map(e => e.executionId),
        status: persisted.status as 'running' | 'completed' | 'error' | 'stopped',
      } as BatchMetadata;
    }

    return null;
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): Array<{
    executionId: string;
    workflowFileName?: string;
    status: ExecutionStatus;
    batchId?: string;
  }> {
    return Array.from(this.executions.values())
      .filter(e => e.status === ExecutionStatus.RUNNING || e.status === ExecutionStatus.IDLE)
      .map(e => ({
        executionId: e.executionId,
        workflowFileName: e.workflowFileName,
        status: e.status,
        batchId: e.batchId,
      }));
  }

  /**
   * Complete batch
   */
  private completeBatch(batchId: string): void {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    // Persist batch completion
    this.saveBatchToPersistence(batch);

    // Emit batch complete event
    this.io.emit('batch-complete', {
      batchId,
      status: batch.status,
      totalWorkflows: batch.totalWorkflows,
      completed: batch.completed,
      failed: batch.failed,
      timestamp: Date.now(),
    });
  }

  /**
   * Update batch progress in persistence
   */
  private updateBatchProgress(batchId: string): void {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    this.persistence.updateBatchProgress(batchId, {
      completed: batch.completed,
      running: batch.running,
      queued: batch.queued,
      failed: batch.failed,
    });
  }

  /**
   * Save batch to persistence
   */
  private saveBatchToPersistence(batch: BatchMetadata): void {
    const metadata: BatchPersistenceMetadata = {
      batchId: batch.batchId,
      status: batch.status || 'running',
      sourceType: batch.sourceType,
      folderPath: batch.folderPath,
      totalWorkflows: batch.totalWorkflows,
      validWorkflows: batch.validWorkflows,
      invalidWorkflows: batch.invalidWorkflows,
      completed: batch.completed,
      running: batch.running,
      queued: batch.queued,
      failed: batch.failed,
      workers: batch.workers,
      priority: batch.priority,
      startTime: batch.startTime,
      endTime: batch.endTime,
      createdAt: batch.startTime,
      outputPath: batch.outputPath,
      startNodeOverrides: batch.startNodeOverrides,
    };

    this.persistence.saveBatch(metadata);
  }

  /**
   * Save execution to persistence
   */
  private saveExecutionToPersistence(execution: {
    executionId: string;
    batchId: string;
    workflowFileName: string;
    workflowPath?: string;
    status: 'queued' | 'running' | 'completed' | 'error' | 'stopped' | 'cancelled';
    startTime: number;
  }): void {
    const metadata: ExecutionPersistenceMetadata = {
      executionId: execution.executionId,
      batchId: execution.batchId,
      workflowFileName: execution.workflowFileName,
      workflowPath: execution.workflowPath,
      status: execution.status,
      startTime: execution.startTime,
    };

    this.persistence.saveExecution(metadata);
  }

  /**
   * Update execution in persistence
   */
  private updateExecutionInPersistence(executionId: string, updates: {
    status?: 'queued' | 'running' | 'completed' | 'error' | 'stopped' | 'cancelled';
    workerId?: number;
    endTime?: number;
    error?: string;
    reportPath?: string;
  }): void {
    const execution = this.executions.get(executionId);
    if (!execution || !execution.batchId) return;

    const metadata: ExecutionPersistenceMetadata = {
      executionId: execution.executionId,
      batchId: execution.batchId,
      workflowFileName: execution.workflowFileName || 'workflow.json',
      workflowPath: execution.workflowPath,
      status: updates.status || (execution.status as any),
      workerId: updates.workerId || execution.workerId,
      startTime: execution.startTime,
      endTime: updates.endTime || execution.endTime,
      error: updates.error || execution.error,
      reportPath: updates.reportPath,
    };

    this.persistence.saveExecution(metadata);
  }

  /**
   * Cleanup execution
   */
  private cleanupExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    // Cleanup executor resources
    try {
      // Executor cleanup is handled by Executor itself
      // Just remove from registry
      this.executions.delete(executionId);
    } catch (error: any) {
      console.error(`[ExecutionManager] Error cleaning up execution ${executionId}:`, error.message);
    }
  }

  /**
   * Get most recent execution ID (for backward compatibility)
   */
  getMostRecentExecutionId(): string | null {
    const executions = Array.from(this.executions.values());
    if (executions.length === 0) return null;

    // Sort by startTime descending
    executions.sort((a, b) => b.startTime - a.startTime);
    return executions[0].executionId;
  }

  /**
   * Get executor instance for an execution (for control endpoints)
   */
  getExecutor(executionId: string): Executor | null {
    const execution = this.executions.get(executionId);
    return execution?.executor || null;
  }
}

// Singleton instance
let instance: ExecutionManager | null = null;

export function getExecutionManager(io: Server, maxWorkers: number = 4): ExecutionManager {
  if (!instance) {
    instance = new ExecutionManager(io, maxWorkers);
  }
  return instance;
}
