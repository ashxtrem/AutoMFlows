import * as fs from 'fs';
import * as path from 'path';
import { Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { getTestNodes, getNodeDisplayName, escapeXml } from './utils';

export async function generateJUnitReport(
  metadata: ExecutionMetadata,
  workflow: Workflow,
  reportDir: string
): Promise<void> {
  const testNodes = getTestNodes(metadata, workflow);
  const testsuites = testNodes.map((node) => {
    const duration = node.endTime && node.startTime
      ? (node.endTime - node.startTime) / 1000
      : 0;
    
    if (node.status === 'error') {
      return `    <testcase name="${escapeXml(getNodeDisplayName(node))}" classname="${node.nodeType}" time="${duration}">
      <failure message="${escapeXml(node.error || 'Unknown error')}">${escapeXml(node.error || 'Unknown error')}</failure>
    </testcase>`;
    } else if (node.status === 'bypassed') {
      return `    <testcase name="${escapeXml(getNodeDisplayName(node))}" classname="${node.nodeType}" time="${duration}">
      <skipped/>
    </testcase>`;
    } else {
      return `    <testcase name="${escapeXml(getNodeDisplayName(node))}" classname="${node.nodeType}" time="${duration}"/>`;
    }
  }).join('\n');

  const totalTests = testNodes.length;
  const failures = testNodes.filter(n => n.status === 'error').length;
  const skipped = testNodes.filter(n => n.status === 'bypassed').length;
  const totalTime = metadata.endTime && metadata.startTime
    ? (metadata.endTime - metadata.startTime) / 1000
    : 0;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="${metadata.workflowName}" tests="${totalTests}" failures="${failures}" skipped="${skipped}" time="${totalTime}" timestamp="${new Date(metadata.startTime).toISOString()}">
${testsuites}
  </testsuite>
</testsuites>`;

  const filePath = path.join(reportDir, 'junit.xml');
  fs.writeFileSync(filePath, xml, 'utf-8');
}
