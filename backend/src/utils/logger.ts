import * as fs from 'fs';
import * as path from 'path';
import { resolveFromProjectRoot } from './pathUtils';

/**
 * Logger utility for writing execution logs to files
 * Creates separate files for terminal logs and browser console logs
 * Maintains a maximum of 10 executions (20 log files total, deletes oldest when exceeded)
 */
export class Logger {
  private terminalLogStream: fs.WriteStream | null = null;
  private consoleLogStream: fs.WriteStream | null = null;
  private logsDir: string;
  private workflowName: string;
  private enabled: boolean;
  private terminalLogPath: string | null = null;
  private consoleLogPath: string | null = null;
  private readonly MAX_LOG_FILES = 10;

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
    
    // Format date as dd-mm-yy-HH-MM-SS
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const dateStr = `${dd}-${mm}-${yy}`;
    
    // Add hour-minute-second suffix to ensure uniqueness for multiple executions
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hh}-${min}-${ss}`;

    // Create file paths with new format: {filename}-{dd}-{mm}-{yy}-{HH}-{MM}-{SS}-terminal.log / console.txt
    this.terminalLogPath = path.join(this.logsDir, `${this.workflowName}-${dateStr}-${timeStr}-terminal.log`);
    this.consoleLogPath = path.join(this.logsDir, `${this.workflowName}-${dateStr}-${timeStr}-console.txt`);

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
        .filter(fileName => fileName.endsWith('-terminal.log') || fileName.endsWith('-console.txt'));

      // Group files by execution ID and extract date for sorting
      // File format: {workflowName}-{dd}-{mm}-{yy}-{HH}-{MM}-{SS}-terminal.log or {workflowName}-{dd}-{mm}-{yy}-{HH}-{MM}-{SS}-console.txt
      const executionMap = new Map<string, { date: Date; files: string[] }>();
      
      for (const fileName of files) {
        // Match new format: {workflowName}-{dd}-{mm}-{yy}-{HH}-{MM}-{SS}-{type}.{ext}
        const newFormatMatch = fileName.match(/^(.+)-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(terminal|console)\.(txt|log)$/);
        // Match old format (timestamp only) for backward compatibility
        const oldFormatMatch = fileName.match(/^(.+)-(\d+)-(terminal|console)\.(txt|log)$/);
        
        if (newFormatMatch) {
          // New format: {workflowName}-{dd}-{mm}-{yy}-{HH}-{MM}-{SS}-{type}.{ext}
          const workflowName = newFormatMatch[1];
          const dd = parseInt(newFormatMatch[2], 10);
          const mm = parseInt(newFormatMatch[3], 10);
          const yy = parseInt(newFormatMatch[4], 10);
          const hh = parseInt(newFormatMatch[5], 10);
          const min = parseInt(newFormatMatch[6], 10);
          const ss = parseInt(newFormatMatch[7], 10);
          // Convert yy to full year (assuming 20yy for years 00-99)
          const fullYear = yy < 50 ? 2000 + yy : 1900 + yy;
          const date = new Date(fullYear, mm - 1, dd, hh, min, ss);
          // Use date-time for execution ID to ensure uniqueness
          const executionId = `${workflowName}-${newFormatMatch[2]}-${newFormatMatch[3]}-${newFormatMatch[4]}-${newFormatMatch[5]}-${newFormatMatch[6]}-${newFormatMatch[7]}`;
          
          if (!executionMap.has(executionId)) {
            executionMap.set(executionId, { date, files: [] });
          }
          executionMap.get(executionId)!.files.push(fileName);
        } else if (oldFormatMatch) {
          // Old format: {workflowName}-{timestamp}-{type}.{ext} (for backward compatibility)
          const workflowName = oldFormatMatch[1];
          const timestamp = parseInt(oldFormatMatch[2], 10);
          const date = new Date(timestamp);
          const executionId = `${workflowName}-${oldFormatMatch[2]}`;
          
          if (!executionMap.has(executionId)) {
            executionMap.set(executionId, { date, files: [] });
          }
          executionMap.get(executionId)!.files.push(fileName);
        }
      }

      const executionCount = executionMap.size;

      // If we exceed MAX_LOG_FILES executions, delete oldest ones
      if (executionCount > this.MAX_LOG_FILES) {
        // Sort executions by date (oldest first)
        const sortedExecutions = Array.from(executionMap.entries())
          .sort((a, b) => a[1].date.getTime() - b[1].date.getTime());
        
        const executionsToDelete = executionCount - this.MAX_LOG_FILES;
        const executionsToRemove = sortedExecutions.slice(0, executionsToDelete);

        // Delete all files for executions that need to be removed
        for (const [_, executionData] of executionsToRemove) {
          for (const fileName of executionData.files) {
            const filePath = path.join(this.logsDir, fileName);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (error: any) {
                console.warn(`[Logger] Failed to delete old log file ${filePath}: ${error.message}`);
              }
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
