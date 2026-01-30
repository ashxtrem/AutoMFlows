import * as fs from 'fs';
import * as path from 'path';
import { resolveFromProjectRoot } from './pathUtils';

/**
 * Logger utility for writing execution logs to files
 * Creates separate files for terminal logs and browser console logs
 * Maintains a maximum of 20 log files (deletes oldest when exceeded)
 */
export class Logger {
  private terminalLogStream: fs.WriteStream | null = null;
  private consoleLogStream: fs.WriteStream | null = null;
  private logsDir: string;
  private workflowName: string;
  private enabled: boolean;
  private terminalLogPath: string | null = null;
  private consoleLogPath: string | null = null;
  private readonly MAX_LOG_FILES = 20;

  constructor() {
    this.logsDir = resolveFromProjectRoot('./logs');
    this.workflowName = 'workflow';
    this.enabled = false;
  }

  /**
   * Initialize logger for an execution
   * @param workflowName - Name of the workflow (will be sanitized for filesystem)
   * @param traceLogs - Whether logging is enabled
   */
  initialize(workflowName: string, traceLogs: boolean): void {
    this.enabled = traceLogs;
    
    if (!this.enabled) {
      return; // Early return if logging is disabled
    }

    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Sanitize workflow name for filesystem compatibility
    this.workflowName = this.sanitizeWorkflowName(workflowName);
    const timestamp = Date.now();

    // Create file paths
    this.terminalLogPath = path.join(this.logsDir, `${this.workflowName}-${timestamp}-terminal.txt`);
    this.consoleLogPath = path.join(this.logsDir, `${this.workflowName}-${timestamp}-console.txt`);

    try {
      // Create write streams for terminal and console logs
      this.terminalLogStream = fs.createWriteStream(this.terminalLogPath, { flags: 'a' });
      this.consoleLogStream = fs.createWriteStream(this.consoleLogPath, { flags: 'a' });

      // Write header to terminal log
      const header = `=== Execution Log - ${this.workflowName} - ${new Date().toISOString()} ===\n`;
      this.terminalLogStream.write(header);

      // Write header to console log
      const consoleHeader = `=== Browser Console Log - ${this.workflowName} - ${new Date().toISOString()} ===\n`;
      this.consoleLogStream.write(consoleHeader);

      // Enforce retention (delete oldest files if count exceeds MAX_LOG_FILES)
      this.enforceRetention();
    } catch (error: any) {
      // Don't fail execution if logging setup fails
      console.warn(`[Logger] Failed to initialize logger: ${error.message}`);
      this.enabled = false;
    }
  }

  /**
   * Write terminal log entry (auto-formats JSON)
   * @param message - Log message
   */
  writeTerminalLog(message: string): void {
    if (!this.enabled || !this.terminalLogStream) {
      return;
    }

    try {
      const formattedMessage = this.formatMessage(message);
      this.terminalLogStream.write(formattedMessage + '\n');
    } catch (error: any) {
      // Don't fail execution if logging fails
      console.warn(`[Logger] Failed to write terminal log: ${error.message}`);
    }
  }

  /**
   * Write browser console log entry (auto-formats JSON)
   * @param level - Log level (log, error, warn, info, etc.)
   * @param message - Log message
   * @param location - Optional location/URL where the log originated
   */
  writeConsoleLog(level: string, message: string, location?: string): void {
    if (!this.enabled || !this.consoleLogStream) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const formattedMessage = this.formatMessage(message);
      const locationStr = location ? ` [${location}]` : '';
      const logEntry = `[${timestamp}] [${level.toUpperCase()}]${locationStr} ${formattedMessage}`;
      this.consoleLogStream.write(logEntry + '\n');
    } catch (error: any) {
      // Don't fail execution if logging fails
      console.warn(`[Logger] Failed to write console log: ${error.message}`);
    }
  }

  /**
   * Close file handles and cleanup
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      let closedCount = 0;
      const checkComplete = () => {
        closedCount++;
        if (closedCount === 2) {
          resolve();
        }
      };

      if (this.terminalLogStream) {
        this.terminalLogStream.end(() => {
          this.terminalLogStream = null;
          checkComplete();
        });
      } else {
        checkComplete();
      }

      if (this.consoleLogStream) {
        this.consoleLogStream.end(() => {
          this.consoleLogStream = null;
          checkComplete();
        });
      } else {
        checkComplete();
      }
    });
  }

  /**
   * Enforce retention policy - delete oldest files when count exceeds MAX_LOG_FILES
   * Runs once during initialization
   */
  private enforceRetention(): void {
    try {
      if (!fs.existsSync(this.logsDir)) {
        return;
      }

      // Read all files in logs directory
      const files = fs.readdirSync(this.logsDir)
        .map(fileName => ({
          name: fileName,
          path: path.join(this.logsDir, fileName),
          mtime: fs.statSync(path.join(this.logsDir, fileName)).mtime.getTime()
        }))
        .filter(file => file.name.endsWith('-terminal.txt') || file.name.endsWith('-console.txt'))
        .sort((a, b) => a.mtime - b.mtime); // Sort by modification time, oldest first

      // Count unique executions (each execution has 2 files: terminal and console)
      // File format: {workflowName}-{timestamp}-terminal.txt or {workflowName}-{timestamp}-console.txt
      const executionGroups = new Map<string, number>();
      for (const file of files) {
        // Extract execution identifier (workflow-timestamp)
        // Match pattern: anything followed by -{timestamp}-terminal.txt or -{timestamp}-console.txt
        // The timestamp is always a number at the end before -terminal or -console
        const match = file.name.match(/^(.+)-(\d+)-(terminal|console)\.txt$/);
        if (match) {
          const workflowName = match[1];
          const timestamp = match[2];
          const executionId = `${workflowName}-${timestamp}`;
          executionGroups.set(executionId, (executionGroups.get(executionId) || 0) + 1);
        }
      }

      const executionCount = executionGroups.size;

      // If we exceed MAX_LOG_FILES executions, delete oldest ones
      if (executionCount > this.MAX_LOG_FILES) {
        const executionsToDelete = executionCount - this.MAX_LOG_FILES;
        const executionIds = Array.from(executionGroups.keys()).slice(0, executionsToDelete);

        // Delete all files for executions that need to be removed
        for (const executionId of executionIds) {
          // executionId format is: {workflowName}-{timestamp}
          const terminalFile = path.join(this.logsDir, `${executionId}-terminal.txt`);
          const consoleFile = path.join(this.logsDir, `${executionId}-console.txt`);

          // Try to delete terminal log file
          if (fs.existsSync(terminalFile)) {
            try {
              fs.unlinkSync(terminalFile);
            } catch (error: any) {
              console.warn(`[Logger] Failed to delete old log file ${terminalFile}: ${error.message}`);
            }
          }

          // Try to delete console log file
          if (fs.existsSync(consoleFile)) {
            try {
              fs.unlinkSync(consoleFile);
            } catch (error: any) {
              console.warn(`[Logger] Failed to delete old log file ${consoleFile}: ${error.message}`);
            }
          }
        }
      }
    } catch (error: any) {
      // Don't fail execution if retention check fails
      console.warn(`[Logger] Failed to enforce retention: ${error.message}`);
    }
  }

  /**
   * Detect and pretty-format JSON strings in log messages
   * @param message - Log message that may contain JSON
   * @returns Formatted message with pretty-printed JSON
   */
  private formatMessage(message: string): string {
    // Fast check: skip if message doesn't contain JSON-like characters
    if (!message.includes('{') && !message.includes('[')) {
      return message; // Early return - no JSON possible
    }

    // Try to detect JSON objects/arrays in the message
    // Match patterns like: {...} or [...]
    // This regex matches balanced braces/brackets
    const jsonPattern = /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\])/g;

    return message.replace(jsonPattern, (match) => {
      try {
        const parsed = JSON.parse(match);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return match; // Not valid JSON, return as-is (fail fast)
      }
    });
  }

  /**
   * Sanitize workflow name for filesystem compatibility
   * @param name - Workflow name
   * @returns Sanitized name safe for use in filenames
   */
  private sanitizeWorkflowName(name: string): string {
    if (!name || name.trim() === '') {
      return 'workflow';
    }

    // Replace invalid filesystem characters with hyphens
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .substring(0, 100); // Limit length
  }

  /**
   * Get the terminal log file path (for debugging/reference)
   */
  getTerminalLogPath(): string | null {
    return this.terminalLogPath;
  }

  /**
   * Get the console log file path (for debugging/reference)
   */
  getConsoleLogPath(): string | null {
    return this.consoleLogPath;
  }
}
