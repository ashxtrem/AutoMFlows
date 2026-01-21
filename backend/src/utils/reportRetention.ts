import * as fs from 'fs';
import * as path from 'path';
import { resolveFromProjectRoot } from './pathUtils';

/**
 * Enforces report retention by deleting old reports beyond the retention limit.
 * Keeps the most recent N reports based on folder creation timestamp.
 * 
 * @param retentionCount - Number of reports to keep (default: 10)
 * @param outputDir - Output directory path (default: './output')
 */
export function enforceReportRetention(
  retentionCount: number = 10,
  outputDir?: string
): void {
  try {
    // Resolve output directory path (handles both relative and absolute paths)
    const outputDirectory = outputDir 
      ? (path.isAbsolute(outputDir) ? outputDir : resolveFromProjectRoot(outputDir))
      : resolveFromProjectRoot('./output');
    
    // If output directory doesn't exist, nothing to clean up
    if (!fs.existsSync(outputDirectory)) {
      return;
    }

    // Get all report folders
    const folders = fs.readdirSync(outputDirectory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const folderPath = path.join(outputDirectory, dirent.name);
        const stats = fs.statSync(folderPath);
        
        // Extract timestamp from folder name (format: workflowName-timestamp)
        const timestampMatch = dirent.name.match(/-(\d+)$/);
        const timestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : stats.birthtimeMs;
        
        return {
          name: dirent.name,
          path: folderPath,
          timestamp,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending (newest first)

    // If we have fewer or equal reports than retention count, nothing to delete
    if (folders.length <= retentionCount) {
      return;
    }

    // Delete folders beyond the retention limit (keep the newest N)
    const foldersToDelete = folders.slice(retentionCount);
    
    for (const folder of foldersToDelete) {
      try {
        fs.rmSync(folder.path, { recursive: true, force: true });
        console.log(`[Report Retention] Deleted old report: ${folder.name}`);
      } catch (error: any) {
        console.warn(`[Report Retention] Failed to delete report ${folder.name}:`, error.message);
      }
    }

    if (foldersToDelete.length > 0) {
      console.log(`[Report Retention] Cleaned up ${foldersToDelete.length} old report(s), keeping ${retentionCount} most recent`);
    }
  } catch (error: any) {
    console.error('[Report Retention] Error enforcing retention:', error.message);
    // Don't throw - retention cleanup should not fail report generation
  }
}
