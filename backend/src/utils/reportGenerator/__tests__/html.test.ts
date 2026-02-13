import * as fs from 'fs';
import * as path from 'path';
import { NodeType } from '@automflows/shared';
import { generateHTMLReport } from '../html';
import { generateHTMLContent } from '../htmlContent';
import { ExecutionMetadata } from '../../executionTracker';
import { Workflow } from '@automflows/shared';

jest.mock('fs');

describe('generateHTMLReport', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;
  let reportDir: string;

  beforeEach(() => {
    reportDir = '/tmp/test-reports/html';
    metadata = {
      executionId: 'exec1',
      workflowName: 'Test Workflow',
      startTime: 1000,
      endTime: 2000,
      status: 'completed',
      outputDirectory: '/tmp/test-reports',
      screenshotsDirectory: '/tmp/test-reports/screenshots',
      videosDirectory: '/tmp/test-reports/videos',
      nodes: [
        {
          nodeId: 'node1',
          nodeType: NodeType.ACTION,
          startTime: 1000,
          endTime: 1500,
          status: 'completed',
        },
      ],
    };
    workflow = {
      nodes: [
        { id: 'node1', type: NodeType.ACTION, position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
    };
  });

  it('should generate HTML report file', async () => {
    await generateHTMLReport(metadata, workflow, reportDir);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(reportDir, 'report.html'),
      expect.any(String),
      'utf-8'
    );
    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    expect(writeCall[1]).toContain('Workflow Execution Report');
  });
});

describe('generateHTMLContent', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;

  beforeEach(() => {
    metadata = {
      executionId: 'exec1',
      workflowName: 'Test Workflow',
      startTime: 1000,
      endTime: 2000,
      status: 'completed',
      outputDirectory: '/tmp/test-reports',
      screenshotsDirectory: '/tmp/test-reports/screenshots',
      videosDirectory: '/tmp/test-reports/videos',
      nodes: [
        {
          nodeId: 'node1',
          nodeType: NodeType.ACTION,
          startTime: 1000,
          endTime: 1500,
          status: 'completed',
        },
      ],
    };
    workflow = {
      nodes: [
        { id: 'node1', type: NodeType.ACTION, position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
    };
  });

  it('should generate HTML content with execution metadata', () => {
    const html = generateHTMLContent(metadata, workflow);

    expect(html).toContain('Workflow Execution Report');
    expect(html).toContain('exec1');
    // Workflow name is in the execution metadata section
    expect(html).toContain('completed');
  });

  it('should include summary cards', () => {
    const html = generateHTMLContent(metadata, workflow);

    expect(html).toContain('Total Nodes');
    expect(html).toContain('Passed');
    expect(html).toContain('Failed');
  });

  it('should include node table', () => {
    const html = generateHTMLContent(metadata, workflow);

    expect(html).toContain('<table>');
    expect(html).toContain('Node');
    expect(html).toContain('Type');
    expect(html).toContain('Status');
    expect(html).toContain('Duration');
  });

  it('should include screenshot toggle buttons when screenshots exist', () => {
    metadata.nodes[0].screenshotPaths = {
      pre: '/tmp/screenshot1.png',
      post: '/tmp/screenshot2.png',
    };

    const html = generateHTMLContent(metadata, workflow, '/tmp/html');

    expect(html).toContain('Screenshots');
    expect(html).toContain('toggleScreenshots');
  });

  it('should include video toggle buttons when video exists', () => {
    metadata.nodes[0].videoPath = '/tmp/video.webm';

    const html = generateHTMLContent(metadata, workflow, '/tmp/html');

    expect(html).toContain('Video');
    expect(html).toContain('toggleVideo');
  });
});
