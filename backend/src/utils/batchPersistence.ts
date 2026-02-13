import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { resolveFromProjectRoot } from './pathUtils';
import { BatchPersistenceMetadata, ExecutionPersistenceMetadata, StartNodeOverrides } from '@automflows/shared';

/**
 * SQLite persistence manager for batch and execution metadata
 * Persists batch history and survives server restarts
 */
export class BatchPersistence {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Database stored in backend/src/data for better organization
    this.dbPath = resolveFromProjectRoot('./backend/src/data/executions.db');
  }

  /**
   * Initialize database and create tables if they don't exist
   */
  initialize(): void {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open database connection
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Create tables
      this.createTables();

      // Create indexes
      this.createIndexes();

      console.log(`[BatchPersistence] Database initialized at ${this.dbPath}`);
    } catch (error: any) {
      console.error('[BatchPersistence] Failed to initialize database:', error.message);
      // Continue without persistence - executions still work, just no history
      this.db = null;
    }
  }

  private createTables(): void {
    if (!this.db) return;

    // Batches table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS batches (
        batchId TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        sourceType TEXT NOT NULL,
        folderPath TEXT,
        totalWorkflows INTEGER NOT NULL,
        validWorkflows INTEGER NOT NULL,
        invalidWorkflows INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        running INTEGER DEFAULT 0,
        queued INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        workers INTEGER NOT NULL,
        priority INTEGER DEFAULT 0,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        createdAt INTEGER NOT NULL,
        outputPath TEXT NOT NULL,
        startNodeOverrides TEXT
      )
    `);

    // Executions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS executions (
        executionId TEXT PRIMARY KEY,
        batchId TEXT NOT NULL,
        workflowFileName TEXT NOT NULL,
        workflowPath TEXT,
        status TEXT NOT NULL,
        workerId INTEGER,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        error TEXT,
        reportPath TEXT,
        FOREIGN KEY(batchId) REFERENCES batches(batchId) ON DELETE CASCADE
      )
    `);
  }

  private createIndexes(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_executions_batchId ON executions(batchId);
      CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
      CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
      CREATE INDEX IF NOT EXISTS idx_batches_createdAt ON batches(createdAt DESC);
    `);
  }

  /**
   * Save or update batch metadata
   */
  saveBatch(batch: BatchPersistenceMetadata): void {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO batches (
          batchId, status, sourceType, folderPath, totalWorkflows, validWorkflows, invalidWorkflows,
          completed, running, queued, failed, workers, priority, startTime, endTime, createdAt, outputPath, startNodeOverrides
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const startNodeOverridesJson = batch.startNodeOverrides 
        ? JSON.stringify(batch.startNodeOverrides) 
        : null;

      stmt.run(
        batch.batchId,
        batch.status,
        batch.sourceType,
        batch.folderPath || null,
        batch.totalWorkflows,
        batch.validWorkflows,
        batch.invalidWorkflows,
        batch.completed,
        batch.running,
        batch.queued,
        batch.failed,
        batch.workers,
        batch.priority,
        batch.startTime,
        batch.endTime || null,
        batch.createdAt,
        batch.outputPath,
        startNodeOverridesJson
      );
    } catch (error: any) {
      console.error(`[BatchPersistence] Failed to save batch ${batch.batchId}:`, error.message);
    }
  }

  /**
   * Save or update execution metadata
   */
  saveExecution(execution: ExecutionPersistenceMetadata): void {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO executions (
          executionId, batchId, workflowFileName, workflowPath, status, workerId,
          startTime, endTime, error, reportPath
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        execution.executionId,
        execution.batchId,
        execution.workflowFileName,
        execution.workflowPath || null,
        execution.status,
        execution.workerId || null,
        execution.startTime,
        execution.endTime || null,
        execution.error || null,
        execution.reportPath || null
      );
    } catch (error: any) {
      console.error(`[BatchPersistence] Failed to save execution ${execution.executionId}:`, error.message);
    }
  }

  /**
   * Load active batches from database (status = 'running' or 'queued')
   */
  loadActiveBatches(): BatchPersistenceMetadata[] {
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM batches 
        WHERE status IN ('running', 'queued')
        ORDER BY createdAt DESC
      `);

      const rows = stmt.all() as any[];
      return rows.map(row => this.mapRowToBatch(row));
    } catch (error: any) {
      console.error('[BatchPersistence] Failed to load active batches:', error.message);
      return [];
    }
  }

  /**
   * Get batch by ID
   */
  getBatch(batchId: string): BatchPersistenceMetadata | null {
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM batches WHERE batchId = ?');
      const row = stmt.get(batchId) as any;
      return row ? this.mapRowToBatch(row) : null;
    } catch (error: any) {
      console.error(`[BatchPersistence] Failed to get batch ${batchId}:`, error.message);
      return null;
    }
  }

  /**
   * Query batches with filters and pagination
   */
  getBatches(filters?: {
    status?: string;
    startDate?: number;
    endDate?: number;
  }, pagination?: {
    limit: number;
    offset: number;
  }): { batches: BatchPersistenceMetadata[]; total: number } {
    if (!this.db) return { batches: [], total: 0 };

    try {
      let query = 'SELECT * FROM batches WHERE 1=1';
      const params: any[] = [];

      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters?.startDate) {
        query += ' AND createdAt >= ?';
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ' AND createdAt <= ?';
        params.push(filters.endDate);
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countStmt = this.db.prepare(countQuery);
      const countResult = countStmt.get(...params) as { count: number };
      const total = countResult.count;

      // Apply pagination
      query += ' ORDER BY createdAt DESC';
      if (pagination) {
        query += ' LIMIT ? OFFSET ?';
        params.push(pagination.limit, pagination.offset);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];
      const batches = rows.map(row => this.mapRowToBatch(row));

      return { batches, total };
    } catch (error: any) {
      console.error('[BatchPersistence] Failed to query batches:', error.message);
      return { batches: [], total: 0 };
    }
  }

  /**
   * Get all executions for a batch
   */
  getBatchExecutions(batchId: string): ExecutionPersistenceMetadata[] {
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare('SELECT * FROM executions WHERE batchId = ? ORDER BY startTime ASC');
      const rows = stmt.all(batchId) as any[];
      return rows.map(row => this.mapRowToExecution(row));
    } catch (error: any) {
      console.error(`[BatchPersistence] Failed to get executions for batch ${batchId}:`, error.message);
      return [];
    }
  }

  /**
   * Update batch progress counts
   */
  updateBatchProgress(batchId: string, counts: {
    completed?: number;
    running?: number;
    queued?: number;
    failed?: number;
  }): void {
    if (!this.db) return;

    try {
      const updates: string[] = [];
      const params: any[] = [];

      if (counts.completed !== undefined) {
        updates.push('completed = ?');
        params.push(counts.completed);
      }
      if (counts.running !== undefined) {
        updates.push('running = ?');
        params.push(counts.running);
      }
      if (counts.queued !== undefined) {
        updates.push('queued = ?');
        params.push(counts.queued);
      }
      if (counts.failed !== undefined) {
        updates.push('failed = ?');
        params.push(counts.failed);
      }

      if (updates.length > 0) {
        params.push(batchId);
        const stmt = this.db.prepare(`UPDATE batches SET ${updates.join(', ')} WHERE batchId = ?`);
        stmt.run(...params);
      }
    } catch (error: any) {
      console.error(`[BatchPersistence] Failed to update batch progress ${batchId}:`, error.message);
    }
  }

  /**
   * Mark batch as stopped (used on server restart)
   */
  markBatchStopped(batchId: string): void {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare('UPDATE batches SET status = ? WHERE batchId = ?');
      stmt.run('stopped', batchId);
    } catch (error: any) {
      console.error(`[BatchPersistence] Failed to mark batch stopped ${batchId}:`, error.message);
    }
  }

  /**
   * Delete batch and its executions (cascade delete)
   */
  deleteBatch(batchId: string): void {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare('DELETE FROM batches WHERE batchId = ?');
      stmt.run(batchId);
      // Executions are automatically deleted via CASCADE
    } catch (error: any) {
      console.error(`[BatchPersistence] Failed to delete batch ${batchId}:`, error.message);
    }
  }

  /**
   * Cleanup old batches based on retention policy
   */
  cleanupOldBatches(retentionDays: number): number {
    if (!this.db) return 0;

    try {
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      const stmt = this.db.prepare('DELETE FROM batches WHERE createdAt < ?');
      const result = stmt.run(cutoffTime);
      return result.changes;
    } catch (error: any) {
      console.error('[BatchPersistence] Failed to cleanup old batches:', error.message);
      return 0;
    }
  }

  /**
   * Clear all batches and executions from database
   * Useful for testing and maintenance
   */
  clearAllBatches(): { batchesDeleted: number; executionsDeleted: number } {
    if (!this.db) return { batchesDeleted: 0, executionsDeleted: 0 };

    try {
      // Get count before deletion
      const execCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM executions');
      const execCount = (execCountStmt.get() as { count: number }).count;
      
      const batchCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM batches');
      const batchCount = (batchCountStmt.get() as { count: number }).count;

      // Delete all executions first (due to foreign key constraint)
      const deleteExecutions = this.db.prepare('DELETE FROM executions');
      deleteExecutions.run();

      // Delete all batches
      const deleteBatches = this.db.prepare('DELETE FROM batches');
      deleteBatches.run();

      return {
        batchesDeleted: batchCount,
        executionsDeleted: execCount,
      };
    } catch (error: any) {
      console.error('[BatchPersistence] Failed to clear all batches:', error.message);
      return { batchesDeleted: 0, executionsDeleted: 0 };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
      } catch (error: any) {
        console.error('[BatchPersistence] Failed to close database:', error.message);
      }
    }
  }

  private mapRowToBatch(row: any): BatchPersistenceMetadata {
    return {
      batchId: row.batchId,
      status: row.status,
      sourceType: row.sourceType,
      folderPath: row.folderPath || undefined,
      totalWorkflows: row.totalWorkflows,
      validWorkflows: row.validWorkflows,
      invalidWorkflows: row.invalidWorkflows,
      completed: row.completed,
      running: row.running,
      queued: row.queued,
      failed: row.failed,
      workers: row.workers,
      priority: row.priority,
      startTime: row.startTime,
      endTime: row.endTime || undefined,
      createdAt: row.createdAt,
      outputPath: row.outputPath,
      startNodeOverrides: row.startNodeOverrides 
        ? JSON.parse(row.startNodeOverrides) as StartNodeOverrides
        : undefined,
    };
  }

  private mapRowToExecution(row: any): ExecutionPersistenceMetadata {
    return {
      executionId: row.executionId,
      batchId: row.batchId,
      workflowFileName: row.workflowFileName,
      workflowPath: row.workflowPath || undefined,
      status: row.status,
      workerId: row.workerId || undefined,
      startTime: row.startTime,
      endTime: row.endTime || undefined,
      error: row.error || undefined,
      reportPath: row.reportPath || undefined,
    };
  }
}

// Singleton instance
let instance: BatchPersistence | null = null;

export function getBatchPersistence(): BatchPersistence {
  if (!instance) {
    instance = new BatchPersistence();
    instance.initialize();
  }
  return instance;
}
