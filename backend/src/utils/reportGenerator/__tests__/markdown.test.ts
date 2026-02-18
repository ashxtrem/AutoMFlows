import * as fs from 'fs';
import * as path from 'path';
import { NodeType } from '@automflows/shared';
import { generateMarkdownReport } from '../markdown';
import { ExecutionMetadata } from '../../executionTracker';
import { Workflow } from '@automflows/shared';

jest.mock('fs');

describe('generateMarkdownReport', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;
  let reportDir: string;

  beforeEach(() => {
    reportDir = '/tmp/test-reports/markdown';
    metadata = {
      executionId: 'exec1',
      workflowName: 'Test Workflow',
      startTime: 1000,
      endTime: 2000,
      status: 'completed',
      outputDirectory: '/tmp/test-reports',
      screenshotsDirectory: '/tmp/test-reports/screenshots',
      snapshotsDirectory: '/tmp/test-reports/snapshots',
      videosDirectory: '/tmp/test-reports/videos',
      nodes: [
        {
          nodeId: 'node1',
          nodeType: NodeType.ACTION,
          startTime: 1000,
          endTime: 1500,
          status: 'completed',
        },
        {
          nodeId: 'node2',
          nodeType: NodeType.VERIFY,
          startTime: 1500,
          endTime: 2000,
          status: 'error',
          error: 'Test error',
        },
      ],
    };
    workflow = {
      nodes: [
        { id: 'node1', type: NodeType.ACTION, position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: NodeType.VERIFY, position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
    };
  });

  it('should generate Markdown report file', async () => {
    await generateMarkdownReport(metadata, workflow, reportDir);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(reportDir, 'report.md'),
      expect.any(String),
      'utf-8'
    );
  });

  it('should include execution metadata', async () => {
    await generateMarkdownReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const markdown = writeCall[1];

    expect(markdown).toContain('# Workflow Execution Report');
    expect(markdown).toContain('**Execution ID:** exec1');
    expect(markdown).toContain('**Workflow:** Test Workflow');
    expect(markdown).toContain('**Status:** completed');
  });

  it('should include summary section', async () => {
    await generateMarkdownReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const markdown = writeCall[1];

    expect(markdown).toContain('## Summary');
    expect(markdown).toContain('**Total Nodes:** 2');
    expect(markdown).toContain('**Passed:** 1');
    expect(markdown).toContain('**Failed:** 1');
  });

  it('should include node execution details table', async () => {
    await generateMarkdownReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const markdown = writeCall[1];

    expect(markdown).toContain('## Node Execution Details');
    expect(markdown).toContain('| Node | Type | Status | Duration | Screenshots | Snapshots | Error |');
    expect(markdown).toContain('✅ completed');
    expect(markdown).toContain('❌ error');
  });

  it('should include status icons', async () => {
    // Clear previous mock calls
    (fs.writeFileSync as jest.Mock).mockClear();
    
    const metadataWithBypassed: ExecutionMetadata = {
      ...metadata,
      nodes: [
        ...metadata.nodes,
        {
          nodeId: 'node3',
          nodeType: NodeType.WAIT,
          startTime: 2000,
          endTime: 2500,
          status: 'bypassed',
        },
      ],
    };
    const workflowWithBypassed: Workflow = {
      ...workflow,
      nodes: [
        ...workflow.nodes,
        { id: 'node3', type: NodeType.WAIT, position: { x: 0, y: 0 }, data: {} },
      ],
    };

    await generateMarkdownReport(metadataWithBypassed, workflowWithBypassed, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const markdown = writeCall[1];

    expect(markdown).toContain('✅');
    expect(markdown).toContain('❌');
    expect(markdown).toContain('⏭️');
  });
});
