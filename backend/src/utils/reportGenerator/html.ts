import * as fs from 'fs';
import * as path from 'path';
import { Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { generateHTMLContent } from './htmlContent';

export async function generateHTMLReport(
  metadata: ExecutionMetadata,
  workflow: Workflow,
  reportDir: string
): Promise<void> {
  // reportDir is the html directory (e.g., output/workflow-timestamp/html)
  // Screenshots are in the parent directory's screenshots folder
  const html = generateHTMLContent(metadata, workflow, reportDir);
  const filePath = path.join(reportDir, 'report.html');
  fs.writeFileSync(filePath, html, 'utf-8');
}
