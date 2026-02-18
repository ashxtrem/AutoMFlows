import * as fs from 'fs';
import * as path from 'path';
import { Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { getTestNodes, getNodeDisplayName } from './utils';

export async function generateMarkdownReport(
  metadata: ExecutionMetadata,
  workflow: Workflow,
  reportDir: string
): Promise<void> {
  const testNodes = getTestNodes(metadata, workflow);
  const duration = metadata.endTime 
    ? ((metadata.endTime - metadata.startTime) / 1000).toFixed(2)
    : 'N/A';
  
  const passedNodes = testNodes.filter(n => n.status === 'completed').length;
  const failedNodes = testNodes.filter(n => n.status === 'error').length;
  const totalNodes = testNodes.length;

  const nodeRows = testNodes.map(node => {
    const nodeDuration = node.endTime && node.startTime
      ? ((node.endTime - node.startTime) / 1000).toFixed(2)
      : 'N/A';
    
    const statusIcon = node.status === 'completed' ? '✅' 
      : node.status === 'error' ? '❌'
      : node.status === 'bypassed' ? '⏭️'
      : '⏳';

    const screenshotCount = node.screenshotPaths ? Object.keys(node.screenshotPaths).length : 0;
    const snapshotCount = node.accessibilitySnapshotPaths ? Object.keys(node.accessibilitySnapshotPaths).length : 0;

    return `| ${getNodeDisplayName(node)} | ${node.nodeType} | ${statusIcon} ${node.status} | ${nodeDuration}s | ${screenshotCount} | ${snapshotCount} | ${node.error || '-'} |`;
  }).join('\n');

  const markdown = `# Workflow Execution Report

**Execution ID:** ${metadata.executionId}  
**Workflow:** ${metadata.workflowName}  
**Started:** ${new Date(metadata.startTime).toLocaleString()}  
**Duration:** ${duration}s  
**Status:** ${metadata.status}

## Summary

- **Total Nodes:** ${totalNodes}
- **Passed:** ${passedNodes}
- **Failed:** ${failedNodes}

## Node Execution Details

| Node | Type | Status | Duration | Screenshots | Snapshots | Error |
|------|------|--------|----------|-------------|-----------|-------|
${nodeRows}
`;

  const filePath = path.join(reportDir, 'report.md');
  fs.writeFileSync(filePath, markdown, 'utf-8');
}
