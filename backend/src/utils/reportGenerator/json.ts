import * as fs from 'fs';
import * as path from 'path';
import { Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { getTestNodes } from './utils';

export async function generateJSONReport(
  metadata: ExecutionMetadata,
  workflow: Workflow,
  reportDir: string
): Promise<void> {
  const testNodes = getTestNodes(metadata, workflow);
  const reportData = {
    executionId: metadata.executionId,
    workflowName: metadata.workflowName,
    startTime: metadata.startTime,
    endTime: metadata.endTime,
    status: metadata.status,
    duration: metadata.endTime 
      ? metadata.endTime - metadata.startTime 
      : null,
    nodes: testNodes.map(node => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeLabel: node.nodeLabel,
      startTime: node.startTime,
      endTime: node.endTime,
      duration: node.endTime && node.startTime 
        ? node.endTime - node.startTime 
        : null,
      status: node.status,
      error: node.error,
      screenshotPaths: node.screenshotPaths,
      accessibilitySnapshotPaths: node.accessibilitySnapshotPaths,
    })),
  };

  const filePath = path.join(reportDir, 'report.json');
  fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf-8');
}
