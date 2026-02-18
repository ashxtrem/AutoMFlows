import * as fs from 'fs';
import * as path from 'path';
import { Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { getTestNodes, getNodeDisplayName } from './utils';

export async function generateCSVReport(
  metadata: ExecutionMetadata,
  workflow: Workflow,
  reportDir: string
): Promise<void> {
  const testNodes = getTestNodes(metadata, workflow);
  const headers = ['Node ID', 'Node Label', 'Node Type', 'Status', 'Start Time', 'End Time', 'Duration (ms)', 'Screenshot Count', 'Snapshot Count', 'Error'];
  const rows = testNodes.map(node => {
    const duration = node.endTime && node.startTime
      ? node.endTime - node.startTime
      : '';
    const screenshotCount = node.screenshotPaths ? Object.keys(node.screenshotPaths).length : 0;
    const snapshotCount = node.accessibilitySnapshotPaths ? Object.keys(node.accessibilitySnapshotPaths).length : 0;
    return [
      node.nodeId,
      node.nodeLabel || '',
      node.nodeType,
      node.status,
      new Date(node.startTime).toISOString(),
      node.endTime ? new Date(node.endTime).toISOString() : '',
      duration.toString(),
      screenshotCount.toString(),
      snapshotCount.toString(),
      node.error || '',
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
  const filePath = path.join(reportDir, 'report.csv');
  fs.writeFileSync(filePath, csv, 'utf-8');
}
