import * as fs from 'fs';
import * as path from 'path';
import { NodeType } from '@automflows/shared';
import { generateJUnitReport } from '../junit';
import { ExecutionMetadata } from '../../executionTracker';
import { Workflow } from '@automflows/shared';

jest.mock('fs');

describe('generateJUnitReport', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;
  let reportDir: string;

  beforeEach(() => {
    reportDir = '/tmp/test-reports/junit';
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
        {
          nodeId: 'node3',
          nodeType: NodeType.WAIT,
          startTime: 2000,
          endTime: 2500,
          status: 'bypassed',
        },
      ],
    };
    workflow = {
      nodes: [
        { id: 'node1', type: NodeType.ACTION, position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: NodeType.VERIFY, position: { x: 0, y: 0 }, data: {} },
        { id: 'node3', type: NodeType.WAIT, position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
    };
  });

  it('should generate JUnit XML report file', async () => {
    await generateJUnitReport(metadata, workflow, reportDir);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(reportDir, 'junit.xml'),
      expect.any(String),
      'utf-8'
    );
  });

  it('should include testsuite with correct attributes', async () => {
    await generateJUnitReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const xmlContent = writeCall[1];

    expect(xmlContent).toContain('<testsuite');
    expect(xmlContent).toContain('name="Test Workflow"');
    expect(xmlContent).toContain('tests="3"');
    expect(xmlContent).toContain('failures="1"');
    expect(xmlContent).toContain('skipped="1"');
  });

  it('should include testcase elements', async () => {
    await generateJUnitReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const xmlContent = writeCall[1];

    expect(xmlContent).toContain('<testcase');
    expect(xmlContent).toContain('name="Action"');
    expect(xmlContent).toContain('classname="action"');
  });

  it('should include failure element for error nodes', async () => {
    await generateJUnitReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const xmlContent = writeCall[1];

    expect(xmlContent).toContain('<failure');
    expect(xmlContent).toContain('Test error');
  });

  it('should include skipped element for bypassed nodes', async () => {
    await generateJUnitReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const xmlContent = writeCall[1];

    expect(xmlContent).toContain('<skipped/>');
  });

  it('should escape XML special characters in error messages', async () => {
    // Clear previous mock calls
    (fs.writeFileSync as jest.Mock).mockClear();
    
    // Create new metadata with special characters in error
    const metadataWithSpecialChars: ExecutionMetadata = {
      ...metadata,
      nodes: [
        metadata.nodes[0],
        {
          ...metadata.nodes[1],
          error: 'Error with <tag> & "quotes"',
        },
        metadata.nodes[2],
      ],
    };
    await generateJUnitReport(metadataWithSpecialChars, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const xmlContent = writeCall[1];

    // Check that XML special characters are escaped
    expect(xmlContent).toContain('&lt;tag&gt;');
    expect(xmlContent).toContain('&amp;');
    expect(xmlContent).toContain('&quot;quotes&quot;');
  });
});
