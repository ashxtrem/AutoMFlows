import * as fs from 'fs';
import * as path from 'path';
import { NodeType } from '@automflows/shared';
import { generateCSVReport } from '../csv';
import { ExecutionMetadata } from '../../executionTracker';
import { Workflow } from '@automflows/shared';

jest.mock('fs');

describe('generateCSVReport', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;
  let reportDir: string;

  beforeEach(() => {
    reportDir = '/tmp/test-reports/csv';
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
          nodeLabel: 'Test Action',
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

  it('should generate CSV report file', async () => {
    await generateCSVReport(metadata, workflow, reportDir);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(reportDir, 'report.csv'),
      expect.any(String),
      'utf-8'
    );
  });

  it('should include CSV headers', async () => {
    await generateCSVReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const csvContent = writeCall[1];

    expect(csvContent).toContain('Node ID');
    expect(csvContent).toContain('Node Label');
    expect(csvContent).toContain('Node Type');
    expect(csvContent).toContain('Status');
    expect(csvContent).toContain('Start Time');
    expect(csvContent).toContain('End Time');
    expect(csvContent).toContain('Duration (ms)');
    expect(csvContent).toContain('Error');
  });

  it('should include node data rows', async () => {
    await generateCSVReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const csvContent = writeCall[1];
    const lines = csvContent.split('\n');

    expect(lines.length).toBeGreaterThan(2); // Header + 2 data rows
    expect(csvContent).toContain('node1');
    expect(csvContent).toContain('Test Action');
    expect(csvContent).toContain('action');
    expect(csvContent).toContain('completed');
  });

  it('should escape quotes in CSV fields', async () => {
    // Clear previous mock calls
    (fs.writeFileSync as jest.Mock).mockClear();
    
    // Set error with quotes on node2 (which already has an error)
    const metadataWithQuotes: ExecutionMetadata = {
      ...metadata,
      nodes: [
        metadata.nodes[0],
        {
          ...metadata.nodes[1],
          error: 'Error with "quotes"',
        },
      ],
    };
    await generateCSVReport(metadataWithQuotes, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const csvContent = writeCall[1];

    // CSV escaping: quotes are doubled - check for the escaped version
    // The error field should have ""quotes"" instead of "quotes"
    expect(csvContent).toContain('quotes');
    // In CSV, quotes inside fields are escaped by doubling them
    expect(csvContent).toContain('""quotes""');
  });

  it('should handle nodes without endTime', async () => {
    metadata.nodes[0].endTime = undefined;
    await generateCSVReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const csvContent = writeCall[1];

    // Should have empty duration field
    expect(csvContent).toContain('node1');
  });
});
